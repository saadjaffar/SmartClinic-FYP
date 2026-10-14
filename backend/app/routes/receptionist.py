from datetime import date, datetime

from flask import Blueprint, request
from sqlalchemy import and_, or_

from app import db
from app.models.appointment import Appointment
from app.models.appointment_slot import AppointmentSlot
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.queue_token import QueueToken
from app.models.user import User
from app.utils.auth import role_required, token_required


receptionist_bp = Blueprint(
    "receptionist",
    __name__,
    url_prefix="/api/receptionist"
)


# ============================================================
# TODAY'S APPOINTMENTS
# ============================================================

@receptionist_bp.route(
    "/appointments/today",
    methods=["GET"]
)
@token_required
@role_required("receptionist")
def get_today_appointments():
    """
    Get today's appointments for receptionist
    ---
    tags:
      - Receptionist
    security:
      - Bearer: []
    responses:
      200:
        description: Today's appointments retrieved successfully
      401:
        description: Unauthorized
      403:
        description: Receptionist access required
    """

    today = date.today()

    # Scheduled appointments have a slot.
    # Emergency walk-ins have slot_id = NULL.
    appointments = (
        Appointment.query
        .filter(
            Appointment.appointment_date == today
        )
        .outerjoin(
            AppointmentSlot,
            Appointment.slot_id == AppointmentSlot.id
        )
        .order_by(
            AppointmentSlot.start_time.is_(None),
            AppointmentSlot.start_time.asc(),
            Appointment.created_at.asc()
        )
        .all()
    )

    result = []

    for appointment in appointments:

        # ----------------------------------------------------
        # PATIENT
        # ----------------------------------------------------

        patient = db.session.get(
            Patient,
            appointment.patient_id
        )

        patient_user = None

        if patient and patient.user_id:
            patient_user = db.session.get(
                User,
                patient.user_id
            )

        # ----------------------------------------------------
        # DOCTOR
        # ----------------------------------------------------

        doctor = db.session.get(
            Doctor,
            appointment.doctor_id
        )

        doctor_user = None

        if doctor:
            doctor_user = db.session.get(
                User,
                doctor.user_id
            )

        # ----------------------------------------------------
        # SLOT
        # ----------------------------------------------------

        slot = None

        if appointment.slot_id:
            slot = db.session.get(
                AppointmentSlot,
                appointment.slot_id
            )

        # ----------------------------------------------------
        # QUEUE
        # ----------------------------------------------------

        queue = (
            QueueToken.query
            .filter_by(
                appointment_id=appointment.id
            )
            .first()
        )

        result.append({
            "id":
                appointment.id,

            "appointment_date":
                appointment
                .appointment_date
                .isoformat(),

            "appointment_type":
                appointment.appointment_type,

            "booking_source":
                appointment.booking_source,

            "status":
                appointment.status,

            "notes":
                appointment.notes,

            "patient": {
                "id": (
                    patient.id
                    if patient
                    else None
                ),

                "name": (
                    patient.display_name
                    if patient
                    else None
                ),

                "email": (
                    patient_user.email
                    if patient_user
                    else None
                ),

                "contact": (
                    patient.contact
                    if patient
                    else None
                ),

                "age": (
                    patient.age
                    if patient
                    else None
                ),

                "gender": (
                    patient.gender
                    if patient
                    else None
                ),

                "patient_type": (
                    "registered"
                    if (
                        patient
                        and patient.user_id
                    )
                    else "front_desk"
                    if patient
                    else None
                )
            },

            "doctor": {
                "id": (
                    doctor.id
                    if doctor
                    else None
                ),

                "name": (
                    doctor_user.name
                    if doctor_user
                    else None
                ),

                "specialization": (
                    doctor.specialization
                    if doctor
                    else None
                ),

                "room_number": (
                    doctor.room_number
                    if doctor
                    else None
                )
            },

            "slot": {
                "start_time": (
                    slot.start_time.strftime(
                        "%H:%M"
                    )
                    if slot
                    else None
                ),

                "end_time": (
                    slot.end_time.strftime(
                        "%H:%M"
                    )
                    if slot
                    else None
                )
            },

            "queue": {
                "id": (
                    queue.id
                    if queue
                    else None
                ),

                "token_number": (
                    queue.token_number
                    if queue
                    else None
                ),

                "status": (
                    queue.status
                    if queue
                    else None
                ),

                "priority": (
                    queue.priority
                    if queue
                    else None
                ),

                "checked_in": bool(
                    queue
                    and queue.check_in_time
                ),

                "check_in_time": (
                    queue
                    .check_in_time
                    .isoformat()
                    if (
                        queue
                        and queue.check_in_time
                    )
                    else None
                )
            }
        })

    return {
        "message":
            "Today's appointments retrieved successfully",

        "status":
            "success",

        "date":
            today.isoformat(),

        "count":
            len(result),

        "appointments":
            result

    }, 200


# ============================================================
# PATIENT CHECK-IN
# ============================================================

@receptionist_bp.route(
    "/appointments/<int:appointment_id>/check-in",
    methods=["PATCH"]
)
@token_required
@role_required("receptionist")
def check_in_patient(
    appointment_id
):
    """
    Check in a patient for today's appointment
    ---
    tags:
      - Receptionist
    security:
      - Bearer: []
    parameters:
      - in: path
        name: appointment_id
        type: integer
        required: true
    responses:
      200:
        description: Patient checked in successfully
      400:
        description: Appointment cannot be checked in
      404:
        description: Appointment or queue token not found
      409:
        description: Patient already checked in
    """

    today = date.today()

    appointment = (
        Appointment.query
        .filter_by(
            id=appointment_id
        )
        .with_for_update()
        .first()
    )

    if not appointment:
        return {
            "message":
                "Appointment not found",

            "status":
                "error"

        }, 404

    # --------------------------------------------------------
    # TODAY ONLY
    # --------------------------------------------------------

    if (
        appointment.appointment_date
        != today
    ):
        return {
            "message": (
                "Only today's appointments "
                "can be checked in"
            ),

            "status":
                "error"

        }, 400

    # --------------------------------------------------------
    # VALID APPOINTMENT STATUS
    # --------------------------------------------------------

    if appointment.status not in [
        "pending",
        "confirmed"
    ]:
        return {
            "message": (
                "This appointment cannot "
                "be checked in"
            ),

            "status":
                "error"

        }, 400

    # --------------------------------------------------------
    # QUEUE TOKEN
    # --------------------------------------------------------

    queue = (
        QueueToken.query
        .filter_by(
            appointment_id=
                appointment.id
        )
        .with_for_update()
        .first()
    )

    if not queue:
        return {
            "message":
                "Queue token not found",

            "status":
                "error"

        }, 404

    if (
        queue.status
        != "waiting"
    ):
        return {
            "message": (
                "This patient cannot "
                "be checked in"
            ),

            "status":
                "error"

        }, 400

    if queue.check_in_time:
        return {
            "message":
                "Patient is already checked in",

            "status":
                "error"

        }, 409

    # --------------------------------------------------------
    # CHECK IN
    # --------------------------------------------------------

    try:
        queue.check_in_time = (
            datetime.utcnow()
        )

        db.session.commit()

        return {
            "message":
                "Patient checked in successfully",

            "status":
                "success",

            "appointment_id":
                appointment.id,

            "queue": {
                "id":
                    queue.id,

                "token_number":
                    queue.token_number,

                "status":
                    queue.status,

                "priority":
                    queue.priority,

                "checked_in":
                    True,

                "check_in_time":
                    queue
                    .check_in_time
                    .isoformat()
            }

        }, 200

    except Exception:
        db.session.rollback()

        return {
            "message":
                "Failed to check in patient",

            "status":
                "error"

        }, 500


# ============================================================
# EMERGENCY WALK-IN OPTIONS
# ============================================================

@receptionist_bp.route(
    "/emergency/options",
    methods=["GET"]
)
@token_required
@role_required("receptionist")
def get_emergency_options():
    """
    Get existing patients and on-duty doctors for emergency walk-in
    ---
    tags:
      - Receptionist
    security:
      - Bearer: []
    parameters:
      - in: query
        name: search
        type: string
        required: false
        description: Search patient by name, email or contact
    responses:
      200:
        description: Emergency walk-in options retrieved successfully
      401:
        description: Unauthorized
      403:
        description: Receptionist access required
    """

    search = str(
        request.args.get(
            "search",
            ""
        )
    ).strip()

    # --------------------------------------------------------
    # PATIENTS
    #
    # Includes:
    # 1. Registered active patients
    # 2. Standalone/front-desk patients
    # --------------------------------------------------------

    patient_query = (
        Patient.query
        .outerjoin(
            User,
            Patient.user_id
            == User.id
        )
        .filter(
            or_(
                Patient.user_id.is_(None),

                and_(
                    User.role == "patient",
                    User.status == "active"
                )
            )
        )
    )

    if search:

        pattern = (
            f"%{search}%"
        )

        patient_query = (
            patient_query
            .filter(
                or_(
                    User.name.ilike(
                        pattern
                    ),

                    User.email.ilike(
                        pattern
                    ),

                    Patient.name.ilike(
                        pattern
                    ),

                    Patient.contact.ilike(
                        pattern
                    )
                )
            )
        )

    patients = (
        patient_query
        .order_by(
            db.func.coalesce(
                User.name,
                Patient.name
            ).asc()
        )
        .limit(100)
        .all()
    )

    patient_result = []

    for patient in patients:

        patient_user = None

        if patient.user_id:
            patient_user = (
                db.session.get(
                    User,
                    patient.user_id
                )
            )

        patient_result.append({
            "id":
                patient.id,

            "name":
                patient.display_name,

            "email": (
                patient_user.email
                if patient_user
                else None
            ),

            "contact":
                patient.contact,

            "age":
                patient.age,

            "gender":
                patient.gender,

            "patient_type": (
                "registered"
                if patient.user_id
                else "front_desk"
            )
        })

    # --------------------------------------------------------
    # ACTIVE + ON-DUTY DOCTORS
    # --------------------------------------------------------

    doctors = (
        Doctor.query
        .join(
            User,
            Doctor.user_id
            == User.id
        )
        .filter(
            User.role == "doctor",
            User.status == "active",
            Doctor.duty_status == "on_duty"
        )
        .order_by(
            User.name.asc()
        )
        .all()
    )

    doctor_result = []

    for doctor in doctors:

        doctor_user = (
            db.session.get(
                User,
                doctor.user_id
            )
        )

        doctor_result.append({
            "id":
                doctor.id,

            "name": (
                doctor_user.name
                if doctor_user
                else None
            ),

            "specialization":
                doctor.specialization,

            "room_number":
                doctor.room_number,

            "duty_status":
                doctor.duty_status
        })

    return {
        "message": (
            "Emergency walk-in options "
            "retrieved successfully"
        ),

        "status":
            "success",

        "patients":
            patient_result,

        "on_duty_doctors":
            doctor_result

    }, 200


# ============================================================
# CREATE EMERGENCY WALK-IN
# ============================================================

@receptionist_bp.route(
    "/emergency/walk-in",
    methods=["POST"]
)
@token_required
@role_required("receptionist")
def create_emergency_walk_in():
    """
    Create emergency walk-in for an existing or new patient
    ---
    tags:
      - Receptionist
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
          properties:

            patient_id:
              type: integer
              example: 1

            new_patient:
              type: object
              properties:

                name:
                  type: string
                  example: Ali Khan

                contact:
                  type: string
                  example: 03001234567

                age:
                  type: integer
                  example: 35

                gender:
                  type: string
                  enum:
                    - Male
                    - Female
                    - Other

            doctor_id:
              type: integer
              example: 1

            emergency_reason:
              type: string
              example: Severe chest pain and difficulty breathing

    responses:
      201:
        description: Emergency walk-in created successfully
      400:
        description: Invalid request or doctor unavailable
      401:
        description: Unauthorized
      403:
        description: Receptionist access required
      404:
        description: Patient or doctor not found
      409:
        description: Patient already has an active emergency case
      500:
        description: Emergency walk-in creation failed
    """

    data = request.get_json(
        silent=True
    ) or {}

    patient_id = data.get(
        "patient_id"
    )

    new_patient_data = data.get(
        "new_patient"
    )

    doctor_id = data.get(
        "doctor_id"
    )

    emergency_reason = str(
        data.get(
            "emergency_reason",
            ""
        )
    ).strip()

    # --------------------------------------------------------
    # BASIC VALIDATION
    # --------------------------------------------------------

    if not doctor_id:
        return {
            "message":
                "doctor_id is required",

            "status":
                "error"

        }, 400

    if not emergency_reason:
        return {
            "message":
                "emergency_reason is required",

            "status":
                "error"

        }, 400

    if len(
        emergency_reason
    ) < 3:
        return {
            "message":
                "Emergency reason is too short",

            "status":
                "error"

        }, 400

    if len(
        emergency_reason
    ) > 1000:
        return {
            "message": (
                "Emergency reason must not "
                "exceed 1000 characters"
            ),

            "status":
                "error"

        }, 400

    # Existing and new cannot both be supplied.
    if (
        patient_id
        and new_patient_data
    ):
        return {
            "message": (
                "Choose either an existing patient "
                "or create a new emergency patient"
            ),

            "status":
                "error"

        }, 400

    if (
        not patient_id
        and not new_patient_data
    ):
        return {
            "message": (
                "Select an existing patient or "
                "provide new_patient details"
            ),

            "status":
                "error"

        }, 400

    # --------------------------------------------------------
    # NEW PATIENT VALIDATION
    # --------------------------------------------------------

    new_name = None
    new_contact = None
    new_age = None
    new_gender = None

    if new_patient_data:

        if not isinstance(
            new_patient_data,
            dict
        ):
            return {
                "message":
                    "new_patient must be an object",

                "status":
                    "error"

            }, 400

        new_name = str(
            new_patient_data.get(
                "name",
                ""
            )
        ).strip()

        new_contact = str(
            new_patient_data.get(
                "contact",
                ""
            )
        ).strip() or None

        raw_age = (
            new_patient_data.get(
                "age"
            )
        )

        raw_gender = str(
            new_patient_data.get(
                "gender",
                ""
            )
        ).strip()

        if len(
            new_name
        ) < 2:
            return {
                "message":
                    "Patient name is required",

                "status":
                    "error"

            }, 400

        if len(
            new_name
        ) > 100:
            return {
                "message":
                    "Patient name is too long",

                "status":
                    "error"

            }, 400

        if (
            new_contact
            and len(
                new_contact
            ) > 30
        ):
            return {
                "message":
                    "Contact number is too long",

                "status":
                    "error"

            }, 400

        if (
            raw_age is not None
            and str(
                raw_age
            ).strip()
        ):
            try:
                new_age = int(
                    raw_age
                )

            except (
                TypeError,
                ValueError
            ):
                return {
                    "message":
                        "Age must be a number",

                    "status":
                        "error"

                }, 400

            if (
                new_age < 0
                or new_age > 130
            ):
                return {
                    "message":
                        "Please enter a valid age",

                    "status":
                        "error"

                }, 400

        if raw_gender:

            normalized_gender = (
                raw_gender
                .capitalize()
            )

            if normalized_gender not in [
                "Male",
                "Female",
                "Other"
            ]:
                return {
                    "message": (
                        "Gender must be Male, "
                        "Female or Other"
                    ),

                    "status":
                        "error"

                }, 400

            new_gender = (
                normalized_gender
            )

    today = date.today()

    try:

        # ----------------------------------------------------
        # PATIENT
        # ----------------------------------------------------

        if patient_id:

            patient = db.session.get(
                Patient,
                patient_id
            )

            if not patient:
                return {
                    "message":
                        "Patient not found",

                    "status":
                        "error"

                }, 404

            # Registered portal patient
            if patient.user_id:

                patient_user = (
                    db.session.get(
                        User,
                        patient.user_id
                    )
                )

                if (
                    not patient_user
                    or patient_user.role
                    != "patient"
                    or patient_user.status
                    != "active"
                ):
                    return {
                        "message": (
                            "Patient account "
                            "is not active"
                        ),

                        "status":
                            "error"

                    }, 400

            # Already-created standalone patient
            elif not patient.name:
                return {
                    "message": (
                        "Standalone patient "
                        "has no name"
                    ),

                    "status":
                        "error"

                }, 400

        else:

            # ------------------------------------------------
            # QUICK EMERGENCY REGISTRATION
            # ------------------------------------------------

            patient = Patient(
                user_id=None,
                name=new_name,
                contact=new_contact,
                age=new_age,
                gender=new_gender
            )

            db.session.add(
                patient
            )

            # Patient ID required for appointment.
            db.session.flush()

        patient_name = (
            patient.display_name
            or "Patient"
        )

        # ----------------------------------------------------
        # LOCK + VALIDATE DOCTOR
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

        doctor_user = (
            db.session.get(
                User,
                doctor.user_id
            )
        )

        if (
            not doctor_user
            or doctor_user.role
            != "doctor"
            or doctor_user.status
            != "active"
        ):
            db.session.rollback()

            return {
                "message": (
                    "Doctor account "
                    "is not active"
                ),

                "status":
                    "error"

            }, 400

        # Emergency requires currently on-duty doctor.
        if (
            doctor.duty_status
            != "on_duty"
        ):
            db.session.rollback()

            return {
                "message": (
                    "Selected doctor is "
                    "currently off duty"
                ),

                "status":
                    "error"

            }, 400

        # ----------------------------------------------------
        # DUPLICATE ACTIVE EMERGENCY
        # ----------------------------------------------------

        existing_emergency = (
            Appointment.query
            .join(
                QueueToken,
                QueueToken.appointment_id
                == Appointment.id
            )
            .filter(
                Appointment.patient_id
                == patient.id,

                Appointment.doctor_id
                == doctor.id,

                Appointment.appointment_date
                == today,

                Appointment.booking_source
                == "walk_in",

                Appointment.status.in_([
                    "pending",
                    "confirmed",
                    "in_progress"
                ]),

                QueueToken.status.in_([
                    "waiting",
                    "called",
                    "in_consultation"
                ])
            )
            .first()
        )

        if existing_emergency:

            db.session.rollback()

            return {
                "message": (
                    "This patient already has "
                    "an active emergency case "
                    "with this doctor today"
                ),

                "status":
                    "error"

            }, 409

        # ----------------------------------------------------
        # NEXT TOKEN NUMBER
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
                == today
            )
            .scalar()
        )

        next_token = (
            last_token or 0
        ) + 1

        # ----------------------------------------------------
        # WALK-IN APPOINTMENT
        # ----------------------------------------------------

        appointment = Appointment(
            patient_id=
                patient.id,

            doctor_id=
                doctor.id,

            slot_id=
                None,

            appointment_date=
                today,

            appointment_type=
                "in_person",

            booking_source=
                "walk_in",

            status=
                "confirmed",

            notes=
                emergency_reason
        )

        db.session.add(
            appointment
        )

        db.session.flush()

        # ----------------------------------------------------
        # URGENT + AUTOMATIC CHECK-IN
        # ----------------------------------------------------

        queue = QueueToken(
            appointment_id=
                appointment.id,

            doctor_id=
                doctor.id,

            patient_id=
                patient.id,

            token_number=
                next_token,

            priority=
                "urgent",

            status=
                "waiting",

            check_in_time=
                datetime.utcnow()
        )

        db.session.add(
            queue
        )

        # New Patient + Appointment + Queue are committed
        # together, so failure rolls all of them back.
        db.session.commit()

        return {
            "message":
                "Emergency walk-in created successfully",

            "status":
                "success",

            "appointment": {
                "id":
                    appointment.id,

                "appointment_date":
                    appointment
                    .appointment_date
                    .isoformat(),

                "appointment_type":
                    appointment
                    .appointment_type,

                "booking_source":
                    appointment
                    .booking_source,

                "slot_id":
                    appointment.slot_id,

                "status":
                    appointment.status,

                "emergency_reason":
                    appointment.notes
            },

            "patient": {
                "id":
                    patient.id,

                "name":
                    patient_name,

                "contact":
                    patient.contact,

                "age":
                    patient.age,

                "gender":
                    patient.gender,

                "patient_type": (
                    "registered"
                    if patient.user_id
                    else "front_desk"
                )
            },

            "doctor": {
                "id":
                    doctor.id,

                "name":
                    doctor_user.name,

                "specialization":
                    doctor.specialization,

                "room_number":
                    doctor.room_number,

                "duty_status":
                    doctor.duty_status
            },

            "queue": {
                "id":
                    queue.id,

                "token_number":
                    queue.token_number,

                "priority":
                    queue.priority,

                "status":
                    queue.status,

                "checked_in":
                    True,

                "check_in_time":
                    queue
                    .check_in_time
                    .isoformat()
            }

        }, 201

    except Exception:

        db.session.rollback()

        return {
            "message":
                "Failed to create emergency walk-in",

            "status":
                "error"

        }, 500


# ============================================================
# RECEPTIONIST - UPDATE QUEUE PRIORITY
# ============================================================

@receptionist_bp.route(
    "/queue/<int:queue_id>/priority",
    methods=["PATCH"]
)
@token_required
@role_required("receptionist")
def update_queue_priority(
    queue_id
):
    """
    Mark a checked-in waiting patient as normal or urgent
    ---
    tags:
      - Receptionist
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: path
        name: queue_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - priority
          properties:
            priority:
              type: string
              enum:
                - normal
                - urgent
              example: urgent
    responses:
      200:
        description: Patient priority updated successfully
      400:
        description: Invalid priority or patient not eligible
      404:
        description: Queue token or appointment not found
      401:
        description: Unauthorized
      403:
        description: Receptionist access required
    """

    data = request.get_json(
        silent=True
    ) or {}

    priority = str(
        data.get(
            "priority",
            ""
        )
    ).strip().lower()

    # --------------------------------------------------------
    # VALIDATE PRIORITY
    # --------------------------------------------------------

    if priority not in [
        "normal",
        "urgent"
    ]:
        return {
            "message": (
                "priority must be "
                "normal or urgent"
            ),

            "status":
                "error"

        }, 400

    # --------------------------------------------------------
    # LOCK QUEUE TOKEN
    # --------------------------------------------------------

    queue = (
        QueueToken.query
        .filter_by(
            id=queue_id
        )
        .with_for_update()
        .first()
    )

    if not queue:
        return {
            "message":
                "Queue token not found",

            "status":
                "error"

        }, 404

    # --------------------------------------------------------
    # APPOINTMENT
    # --------------------------------------------------------

    appointment = (
        db.session.get(
            Appointment,
            queue.appointment_id
        )
    )

    if not appointment:

        db.session.rollback()

        return {
            "message":
                "Appointment not found",

            "status":
                "error"

        }, 404

    # --------------------------------------------------------
    # TODAY ONLY
    # --------------------------------------------------------

    if (
        appointment.appointment_date
        != date.today()
    ):
        db.session.rollback()

        return {
            "message": (
                "Only today's patient "
                "priority can be changed"
            ),

            "status":
                "error"

        }, 400

    # --------------------------------------------------------
    # CHECKED IN ONLY
    # --------------------------------------------------------

    if not queue.check_in_time:

        db.session.rollback()

        return {
            "message": (
                "Patient must be checked in "
                "before priority can be changed"
            ),

            "status":
                "error"

        }, 400

    # --------------------------------------------------------
    # WAITING ONLY
    # --------------------------------------------------------

    if (
        queue.status
        != "waiting"
    ):
        db.session.rollback()

        return {
            "message": (
                "Only a waiting patient "
                "can have priority changed"
            ),

            "status":
                "error"

        }, 400

    # --------------------------------------------------------
    # UPDATE
    # --------------------------------------------------------

    try:

        queue.priority = (
            priority
        )

        db.session.commit()

        return {
            "message": (
                "Patient marked as urgent successfully"
                if priority == "urgent"
                else
                "Patient priority changed to normal"
            ),

            "status":
                "success",

            "queue": {
                "id":
                    queue.id,

                "token_number":
                    queue.token_number,

                "priority":
                    queue.priority,

                "queue_status":
                    queue.status
            }

        }, 200

    except Exception:

        db.session.rollback()

        return {
            "message":
                "Failed to update patient priority",

            "status":
                "error"

        }, 500


# ============================================================
# RECEPTIONIST - TODAY'S LIVE QUEUE
# ============================================================

@receptionist_bp.route(
    "/queue/today",
    methods=["GET"]
)
@token_required
@role_required("receptionist")
def get_today_live_queue():
    """
    Get today's checked-in live clinic queue
    ---
    tags:
      - Receptionist
    security:
      - Bearer: []
    responses:
      200:
        description: Today's live queue retrieved successfully
      401:
        description: Unauthorized
      403:
        description: Receptionist access required
    """

    today = date.today()

    # Only checked-in patients belong to live queue.
    queue_tokens = (
        QueueToken.query
        .join(
            Appointment,
            QueueToken.appointment_id
            == Appointment.id
        )
        .filter(
            Appointment.appointment_date
            == today,

            QueueToken.check_in_time
            .isnot(None)
        )
        .order_by(
            QueueToken.doctor_id.asc(),
            QueueToken.priority.desc(),
            QueueToken.token_number.asc()
        )
        .all()
    )

    result = []

    for queue in queue_tokens:

        # ----------------------------------------------------
        # APPOINTMENT
        # ----------------------------------------------------

        appointment = db.session.get(
            Appointment,
            queue.appointment_id
        )

        # ----------------------------------------------------
        # PATIENT
        # ----------------------------------------------------

        patient = db.session.get(
            Patient,
            queue.patient_id
        )

        # ----------------------------------------------------
        # DOCTOR
        # ----------------------------------------------------

        doctor = db.session.get(
            Doctor,
            queue.doctor_id
        )

        doctor_user = None

        if doctor:
            doctor_user = db.session.get(
                User,
                doctor.user_id
            )

        # ----------------------------------------------------
        # SLOT
        # Emergency walk-ins have no slot.
        # ----------------------------------------------------

        slot = None

        if (
            appointment
            and appointment.slot_id
        ):
            slot = db.session.get(
                AppointmentSlot,
                appointment.slot_id
            )

        result.append({
            "queue_id":
                queue.id,

            "appointment_id":
                queue.appointment_id,

            "token_number":
                queue.token_number,

            "priority":
                queue.priority,

            "status":
                queue.status,

            "check_in_time": (
                queue
                .check_in_time
                .isoformat()
                if queue.check_in_time
                else None
            ),

            "called_at": (
                queue
                .called_at
                .isoformat()
                if queue.called_at
                else None
            ),

            "consultation_started_at": (
                queue
                .consultation_started_at
                .isoformat()
                if queue
                .consultation_started_at
                else None
            ),

            "completed_at": (
                queue
                .completed_at
                .isoformat()
                if queue.completed_at
                else None
            ),

            "appointment_status": (
                appointment.status
                if appointment
                else None
            ),

            "appointment_type": (
                appointment.appointment_type
                if appointment
                else None
            ),

            "booking_source": (
                appointment.booking_source
                if appointment
                else None
            ),

            "emergency_reason": (
                appointment.notes
                if (
                    appointment
                    and
                    appointment.booking_source
                    == "walk_in"
                )
                else None
            ),

            "patient": {
                "id": (
                    patient.id
                    if patient
                    else None
                ),

                "name": (
                    patient.display_name
                    if patient
                    else None
                ),

                "contact": (
                    patient.contact
                    if patient
                    else None
                ),

                "patient_type": (
                    "registered"
                    if (
                        patient
                        and patient.user_id
                    )
                    else "front_desk"
                    if patient
                    else None
                )
            },

            "doctor": {
                "id": (
                    doctor.id
                    if doctor
                    else None
                ),

                "name": (
                    doctor_user.name
                    if doctor_user
                    else None
                ),

                "specialization": (
                    doctor.specialization
                    if doctor
                    else None
                ),

                "room_number": (
                    doctor.room_number
                    if doctor
                    else None
                )
            },

            "slot": {
                "start_time": (
                    slot
                    .start_time
                    .strftime(
                        "%H:%M"
                    )
                    if slot
                    else None
                ),

                "end_time": (
                    slot
                    .end_time
                    .strftime(
                        "%H:%M"
                    )
                    if slot
                    else None
                )
            }
        })

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    waiting = sum(
        1
        for item in queue_tokens
        if item.status
        == "waiting"
    )

    called = sum(
        1
        for item in queue_tokens
        if item.status
        == "called"
    )

    in_consultation = sum(
        1
        for item in queue_tokens
        if item.status
        == "in_consultation"
    )

    completed = sum(
        1
        for item in queue_tokens
        if item.status
        == "completed"
    )

    return {
        "message": (
            "Today's live queue "
            "retrieved successfully"
        ),

        "status":
            "success",

        "date":
            today.isoformat(),

        "summary": {
            "total_checked_in":
                len(queue_tokens),

            "waiting":
                waiting,

            "called":
                called,

            "in_consultation":
                in_consultation,

            "completed":
                completed
        },

        "count":
            len(result),

        "queue":
            result

    }, 200