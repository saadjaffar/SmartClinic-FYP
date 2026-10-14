from datetime import datetime

from flask import Blueprint, request

from app import db
from app.models.appointment import Appointment
from app.models.appointment_slot import AppointmentSlot
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.queue_token import QueueToken
from app.models.user import User
from app.utils.auth import role_required, token_required


appointment_bp = Blueprint(
    "appointment",
    __name__,
    url_prefix="/api/appointments",
)


# ============================================================
# PATIENT - GET AVAILABLE APPOINTMENT SLOTS
# ============================================================

@appointment_bp.route("/slots", methods=["GET"])
@token_required
@role_required("patient")
def get_available_slots():
    """
    Get available appointment slots
    ---
    tags:
      - Appointments
    security:
      - Bearer: []
    parameters:
      - in: query
        name: doctor_id
        type: integer
        required: true
        example: 1
      - in: query
        name: date
        type: string
        required: true
        format: date
        example: "2026-10-01"
    responses:
      200:
        description: Available slots retrieved successfully
      400:
        description: Invalid request
      401:
        description: Unauthorized
      403:
        description: Patient access required
      404:
        description: Doctor not found
    """

    doctor_id = request.args.get(
        "doctor_id",
        type=int
    )

    slot_date = request.args.get(
        "date"
    )

    if (
        not doctor_id
        or not slot_date
    ):
        return {
            "message": (
                "doctor_id and date are required"
            ),
            "status":
                "error"
        }, 400

    try:
        requested_date = datetime.strptime(
            slot_date,
            "%Y-%m-%d"
        ).date()

    except ValueError:
        return {
            "message": (
                "Date must use YYYY-MM-DD format"
            ),
            "status":
                "error"
        }, 400

    today = datetime.now().date()

    if requested_date < today:
        return {
            "message": (
                "Past appointment dates "
                "are not available"
            ),
            "status":
                "error"
        }, 400

    doctor = db.session.get(
        Doctor,
        doctor_id
    )

    if not doctor:
        return {
            "message":
                "Doctor not found",
            "status":
                "error"
        }, 404

    query = AppointmentSlot.query.filter(
        AppointmentSlot.doctor_id
        == doctor_id,

        AppointmentSlot.slot_date
        == requested_date,

        AppointmentSlot.status
        == "available"
    )

    # --------------------------------------------------------
    # IF TODAY, DO NOT RETURN ALREADY-PASSED TIMES
    # --------------------------------------------------------

    if requested_date == today:
        current_time = (
            datetime.now().time()
        )

        query = query.filter(
            AppointmentSlot.start_time
            > current_time
        )

    slots = query.order_by(
        AppointmentSlot.start_time.asc()
    ).all()

    result = []

    for slot in slots:
        result.append({
            "id":
                slot.id,

            "date": (
                slot.slot_date.isoformat()
            ),

            "start_time": (
                slot.start_time.strftime(
                    "%H:%M"
                )
            ),

            "end_time": (
                slot.end_time.strftime(
                    "%H:%M"
                )
            ),

            "status":
                slot.status
        })

    return {
        "message": (
            "Available slots retrieved successfully"
        ),

        "status":
            "success",

        "doctor_id":
            doctor_id,

        "date":
            requested_date.isoformat(),

        "count":
            len(result),

        "slots":
            result
    }, 200


# ============================================================
# PATIENT - BOOK APPOINTMENT
# ============================================================

@appointment_bp.route(
    "",
    methods=["POST"]
)
@token_required
@role_required("patient")
def book_appointment():
    """
    Book an appointment
    ---
    tags:
      - Appointments
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - doctor_id
            - slot_id
            - appointment_type
          properties:
            doctor_id:
              type: integer
              example: 1
            slot_id:
              type: integer
              example: 1
            appointment_type:
              type: string
              enum:
                - in_person
                - video
              example: in_person
            notes:
              type: string
              example: Regular checkup
    responses:
      201:
        description: Appointment booked successfully
      400:
        description: Invalid request
      401:
        description: Unauthorized
      403:
        description: Patient access required
      404:
        description: Required record not found
      409:
        description: Slot is unavailable
      500:
        description: Booking failed
    """

    user_id = request.user[
        "user_id"
    ]

    patient = (
        Patient.query
        .filter_by(
            user_id=user_id
        )
        .first()
    )

    if not patient:
        return {
            "message":
                "Patient profile not found",
            "status":
                "error"
        }, 404

    data = request.get_json(
        silent=True
    )

    if not data:
        return {
            "message":
                "Request body is required",
            "status":
                "error"
        }, 400

    doctor_id = data.get(
        "doctor_id"
    )

    slot_id = data.get(
        "slot_id"
    )

    appointment_type = data.get(
        "appointment_type"
    )

    notes = data.get(
        "notes"
    )

    if (
        not doctor_id
        or not slot_id
        or not appointment_type
    ):
        return {
            "message": (
                "doctor_id, slot_id and "
                "appointment_type are required"
            ),
            "status":
                "error"
        }, 400

    if appointment_type not in [
        "in_person",
        "video"
    ]:
        return {
            "message": (
                "appointment_type must be "
                "in_person or video"
            ),
            "status":
                "error"
        }, 400

    if notes is not None:
        notes = str(
            notes
        ).strip()

        if not notes:
            notes = None

    try:
        # ----------------------------------------------------
        # LOCK DOCTOR
        #
        # This serializes bookings for this doctor and
        # protects queue-token number generation.
        # ----------------------------------------------------

        doctor = (
            Doctor.query
            .filter_by(
                id=doctor_id
            )
            .with_for_update()
            .first()
        )

        if not doctor:
            db.session.rollback()

            return {
                "message":
                    "Doctor not found",
                "status":
                    "error"
            }, 404

        # ----------------------------------------------------
        # DOCTOR ACCOUNT MUST BE ACTIVE
        #
        # Scheduled appointments are based on generated slots.
        # Current duty status is reserved for live/emergency
        # workflow and must not block future scheduled booking.
        # ----------------------------------------------------

        doctor_user = db.session.get(
            User,
            doctor.user_id
        )

        if (
            not doctor_user
            or doctor_user.status != "active"
        ):
            db.session.rollback()

            return {
                "message": (
                    "Doctor account is not active"
                ),
                "status":
                    "error"
            }, 400

        # ----------------------------------------------------
        # LOCK SLOT
        #
        # Only one concurrent transaction may successfully
        # reserve this slot.
        # ----------------------------------------------------

        slot = (
            AppointmentSlot.query
            .filter_by(
                id=slot_id
            )
            .with_for_update()
            .first()
        )

        if not slot:
            db.session.rollback()

            return {
                "message":
                    "Slot not found",
                "status":
                    "error"
            }, 404

        if slot.doctor_id != doctor.id:
            db.session.rollback()

            return {
                "message": (
                    "Selected slot does not "
                    "belong to this doctor"
                ),
                "status":
                    "error"
            }, 400

        # ----------------------------------------------------
        # SLOT MUST STILL BE AVAILABLE AFTER LOCK
        # ----------------------------------------------------

        if slot.status != "available":
            db.session.rollback()

            return {
                "message": (
                    "This slot is no longer available"
                ),
                "status":
                    "error"
            }, 409

        # ----------------------------------------------------
        # DO NOT ALLOW PAST APPOINTMENT TIMES
        # ----------------------------------------------------

        slot_datetime = datetime.combine(
            slot.slot_date,
            slot.start_time
        )

        if slot_datetime <= datetime.now():
            db.session.rollback()

            return {
                "message": (
                    "Past appointment slots "
                    "cannot be booked"
                ),
                "status":
                    "error"
            }, 400

        # ----------------------------------------------------
        # EXTRA DUPLICATE PROTECTION
        # ----------------------------------------------------

        existing_appointment = (
            Appointment.query
            .filter(
                Appointment.patient_id
                == patient.id,

                Appointment.slot_id
                == slot.id,

                Appointment.status
                != "cancelled"
            )
            .first()
        )

        if existing_appointment:
            db.session.rollback()

            return {
                "message": (
                    "You already have an "
                    "appointment for this slot"
                ),
                "status":
                    "error"
            }, 409

        # ----------------------------------------------------
        # NEXT QUEUE TOKEN
        #
        # Numbering resets for each doctor and each
        # appointment date.
        # ----------------------------------------------------

        last_token = (
            db.session.query(
                db.func.max(
                    QueueToken.token_number
                )
            )
            .join(
                Appointment,
                QueueToken.appointment_id
                == Appointment.id
            )
            .filter(
                QueueToken.doctor_id
                == doctor.id,

                Appointment.appointment_date
                == slot.slot_date
            )
            .scalar()
        )

        next_token = (
            last_token or 0
        ) + 1

        # ----------------------------------------------------
        # CREATE APPOINTMENT
        # ----------------------------------------------------

        appointment = Appointment(
            patient_id=
                patient.id,

            doctor_id=
                doctor.id,

            slot_id=
                slot.id,

            appointment_date=
                slot.slot_date,

            appointment_type=
                appointment_type,

            booking_source=
                "scheduled",

            status=
                "confirmed",

            notes=
                notes
        )

        db.session.add(
            appointment
        )

        # Need appointment ID for queue token.
        db.session.flush()

        # ----------------------------------------------------
        # CREATE QUEUE TOKEN
        # ----------------------------------------------------

        queue_token = QueueToken(
            appointment_id=
                appointment.id,

            doctor_id=
                doctor.id,

            patient_id=
                patient.id,

            token_number=
                next_token,

            priority=
                "normal",

            status=
                "waiting"
        )

        db.session.add(
            queue_token
        )

        # ----------------------------------------------------
        # RESERVE SLOT
        # ----------------------------------------------------

        slot.status = "booked"

        slot.version = (
            slot.version or 0
        ) + 1

        # ----------------------------------------------------
        # COMMIT EVERYTHING TOGETHER
        # ----------------------------------------------------

        db.session.commit()

        return {
            "message": (
                "Appointment booked successfully"
            ),

            "status":
                "success",

            "appointment": {
                "id":
                    appointment.id,

                "doctor_id":
                    appointment.doctor_id,

                "doctor_name":
                    doctor_user.name,

                "specialization":
                    doctor.specialization,

                "room_number":
                    doctor.room_number,

                "slot_id":
                    appointment.slot_id,

                "appointment_date": (
                    appointment
                    .appointment_date
                    .isoformat()
                ),

                "appointment_time": (
                    slot.start_time.strftime(
                        "%H:%M"
                    )
                ),

                "appointment_end_time": (
                    slot.end_time.strftime(
                        "%H:%M"
                    )
                ),

                "appointment_type":
                    appointment.appointment_type,

                "booking_source":
                    appointment.booking_source,

                "status":
                    appointment.status,

                "notes":
                    appointment.notes,

                "queue_token":
                    next_token,

                "queue_status":
                    queue_token.status
            }
        }, 201

    except Exception:
        db.session.rollback()

        return {
            "message": (
                "Failed to book appointment"
            ),
            "status":
                "error"
        }, 500


# ============================================================
# PATIENT - GET MY APPOINTMENTS
# ============================================================

@appointment_bp.route(
    "/my",
    methods=["GET"]
)
@token_required
@role_required("patient")
def my_appointments():
    """
    Get my appointments
    ---
    tags:
      - Appointments
    security:
      - Bearer: []
    responses:
      200:
        description: Appointments retrieved successfully
      401:
        description: Unauthorized
      403:
        description: Patient access required
      404:
        description: Patient profile not found
    """

    user_id = request.user[
        "user_id"
    ]

    patient = (
        Patient.query
        .filter_by(
            user_id=user_id
        )
        .first()
    )

    if not patient:
        return {
            "message":
                "Patient profile not found",
            "status":
                "error"
        }, 404

    appointments = (
        Appointment.query
        .filter_by(
            patient_id=patient.id
        )
        .order_by(
            Appointment
            .appointment_date
            .desc()
        )
        .all()
    )

    result = []

    for appointment in appointments:

        # ----------------------------------------------------
        # DOCTOR DETAILS
        # ----------------------------------------------------

        doctor = db.session.get(
            Doctor,
            appointment.doctor_id
        )

        doctor_name = None

        if doctor:
            doctor_user = db.session.get(
                User,
                doctor.user_id
            )

            if doctor_user:
                doctor_name = (
                    doctor_user.name
                )

        # ----------------------------------------------------
        # QUEUE DETAILS
        # ----------------------------------------------------

        queue = (
            QueueToken.query
            .filter_by(
                appointment_id=
                    appointment.id
            )
            .first()
        )

        # ----------------------------------------------------
        # SLOT DETAILS
        #
        # Scheduled appointments have a slot.
        # Emergency walk-in appointments may have slot_id=NULL.
        # ----------------------------------------------------

        slot = None

        if appointment.slot_id:
            slot = db.session.get(
                AppointmentSlot,
                appointment.slot_id
            )

        result.append({
            "id":
                appointment.id,

            "doctor_id":
                appointment.doctor_id,

            "doctor_name":
                doctor_name,

            "specialization": (
                doctor.specialization
                if doctor
                else None
            ),

            "room_number": (
                doctor.room_number
                if doctor
                else None
            ),

            "working_hours": (
                doctor.working_hours
                if doctor
                else None
            ),

            "slot_id":
                appointment.slot_id,

            "appointment_date": (
                appointment
                .appointment_date
                .isoformat()
            ),

            "appointment_time": (
                slot.start_time.strftime(
                    "%H:%M"
                )
                if slot
                else None
            ),

            "appointment_end_time": (
                slot.end_time.strftime(
                    "%H:%M"
                )
                if slot
                else None
            ),

            "appointment_type":
                appointment.appointment_type,

            "booking_source":
                appointment.booking_source,

            "status":
                appointment.status,

            "notes":
                appointment.notes,

            "queue_token": (
                queue.token_number
                if queue
                else None
            ),

            "queue_status": (
                queue.status
                if queue
                else None
            ),

            "queue_priority": (
                queue.priority
                if queue
                else None
            )
        })

    return {
        "message": (
            "Appointments retrieved successfully"
        ),

        "status":
            "success",

        "count":
            len(result),

        "appointments":
            result
    }, 200


# ============================================================
# PATIENT - CANCEL APPOINTMENT
# ============================================================

@appointment_bp.route(
    "/<int:appointment_id>/cancel",
    methods=["PATCH"]
)
@token_required
@role_required("patient")
def cancel_appointment(
    appointment_id
):
    """
    Cancel an appointment
    ---
    tags:
      - Appointments
    security:
      - Bearer: []
    parameters:
      - in: path
        name: appointment_id
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Appointment cancelled successfully
      400:
        description: Appointment cannot be cancelled
      401:
        description: Unauthorized
      403:
        description: Access denied
      404:
        description: Required record not found
      500:
        description: Cancellation failed
    """

    user_id = request.user[
        "user_id"
    ]

    patient = (
        Patient.query
        .filter_by(
            user_id=user_id
        )
        .first()
    )

    if not patient:
        return {
            "message":
                "Patient profile not found",
            "status":
                "error"
        }, 404

    try:
        # ----------------------------------------------------
        # LOCK APPOINTMENT
        # ----------------------------------------------------

        appointment = (
            Appointment.query
            .filter_by(
                id=appointment_id
            )
            .with_for_update()
            .first()
        )

        if not appointment:
            db.session.rollback()

            return {
                "message":
                    "Appointment not found",
                "status":
                    "error"
            }, 404

        # ----------------------------------------------------
        # PATIENT MAY ONLY CANCEL OWN APPOINTMENT
        # ----------------------------------------------------

        if (
            appointment.patient_id
            != patient.id
        ):
            db.session.rollback()

            return {
                "message":
                    "Access denied",
                "status":
                    "error"
            }, 403

        # ----------------------------------------------------
        # WALK-IN APPOINTMENTS
        #
        # Emergency walk-in patients are already physically
        # checked in at the clinic. They cannot cancel the
        # live emergency case from the patient application.
        # ----------------------------------------------------

        if (
            appointment.booking_source
            == "walk_in"
        ):
            db.session.rollback()

            return {
                "message": (
                    "Emergency walk-in appointments "
                    "cannot be cancelled from "
                    "the patient app"
                ),
                "status":
                    "error"
            }, 400

        # ----------------------------------------------------
        # ONLY UPCOMING CONFIRMED/PENDING APPOINTMENTS
        # MAY BE CANCELLED
        # ----------------------------------------------------

        if appointment.status not in [
            "pending",
            "confirmed"
        ]:
            db.session.rollback()

            return {
                "message": (
                    "This appointment "
                    "cannot be cancelled"
                ),
                "status":
                    "error"
            }, 400

        # ----------------------------------------------------
        # LOCK SLOT
        # ----------------------------------------------------

        slot = (
            AppointmentSlot.query
            .filter_by(
                id=appointment.slot_id
            )
            .with_for_update()
            .first()
        )

        if not slot:
            db.session.rollback()

            return {
                "message": (
                    "Appointment slot not found"
                ),
                "status":
                    "error"
            }, 404

        slot_datetime = datetime.combine(
            slot.slot_date,
            slot.start_time
        )

        if slot_datetime <= datetime.now():
            db.session.rollback()

            return {
                "message": (
                    "Past appointments "
                    "cannot be cancelled"
                ),
                "status":
                    "error"
            }, 400

        # ----------------------------------------------------
        # LOCK QUEUE TOKEN
        # ----------------------------------------------------

        queue = (
            QueueToken.query
            .filter_by(
                appointment_id=
                    appointment.id
            )
            .with_for_update()
            .first()
        )

        # Once doctor has called/started the patient,
        # patient-side cancellation should not continue.

        if (
            queue
            and queue.status != "waiting"
        ):
            db.session.rollback()

            return {
                "message": (
                    "This appointment can no "
                    "longer be cancelled"
                ),
                "status":
                    "error"
            }, 400

        # ----------------------------------------------------
        # CANCEL APPOINTMENT
        # ----------------------------------------------------

        appointment.status = "cancelled"

        # ----------------------------------------------------
        # RELEASE SLOT
        # ----------------------------------------------------

        if slot.status == "booked":
            slot.status = "available"

            slot.version = (
                slot.version or 0
            ) + 1

        # ----------------------------------------------------
        # CLOSE QUEUE TOKEN
        # ----------------------------------------------------

        if queue:
            queue.status = "skipped"

        # ----------------------------------------------------
        # COMMIT EVERYTHING TOGETHER
        # ----------------------------------------------------

        db.session.commit()

        return {
            "message": (
                "Appointment cancelled successfully"
            ),
            "status":
                "success"
        }, 200

    except Exception:
        db.session.rollback()

        return {
            "message": (
                "Failed to cancel appointment"
            ),
            "status":
                "error"
        }, 500