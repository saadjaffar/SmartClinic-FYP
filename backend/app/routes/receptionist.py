from datetime import date, datetime

from flask import Blueprint

from app import db
from app.models.appointment import Appointment
from app.models.appointment_slot import AppointmentSlot
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.queue_token import QueueToken
from app.models.user import User
from app.utils.auth import (
    role_required,
    token_required,
)


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
    today = date.today()

    appointments = (
        Appointment.query
        .filter(
            Appointment.appointment_date
            == today
        )
        .join(
            AppointmentSlot,
            Appointment.slot_id
            == AppointmentSlot.id
        )
        .order_by(
            AppointmentSlot
            .start_time
            .asc()
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

        if patient:
            patient_user = (
                db.session.get(
                    User,
                    patient.user_id
                )
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
            doctor_user = (
                db.session.get(
                    User,
                    doctor.user_id
                )
            )


        # ----------------------------------------------------
        # SLOT
        # ----------------------------------------------------

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
                appointment_id=
                    appointment.id
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
                appointment
                .appointment_type,

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
                    patient_user.name
                    if patient_user
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
                ),
            },

            "slot": {
                "start_time": (
                    slot.start_time
                    .strftime("%H:%M")
                    if slot
                    else None
                ),

                "end_time": (
                    slot.end_time
                    .strftime("%H:%M")
                    if slot
                    else None
                ),
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
                    and
                    queue.check_in_time
                ),

                "check_in_time": (
                    queue
                    .check_in_time
                    .isoformat()
                    if (
                        queue
                        and
                        queue.check_in_time
                    )
                    else None
                ),
            }
        })


    return {
        "message": (
            "Today's appointments retrieved successfully"
        ),

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
    # APPOINTMENT STATUS
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
            "message": (
                "Patient checked in successfully"
            ),

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
            "message": (
                "Failed to check in patient"
            ),

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
    today = date.today()


    # Only checked-in patients belong
    # to the live clinic queue.
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

        patient_user = None

        if patient:
            patient_user = (
                db.session.get(
                    User,
                    patient.user_id
                )
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
            doctor_user = (
                db.session.get(
                    User,
                    doctor.user_id
                )
            )


        # ----------------------------------------------------
        # SLOT
        # ----------------------------------------------------

        slot = None

        if appointment:
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

            "patient": {
                "id": (
                    patient.id
                    if patient
                    else None
                ),

                "name": (
                    patient_user.name
                    if patient_user
                    else None
                ),

                "contact": (
                    patient.contact
                    if patient
                    else None
                ),
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
                ),
            },

            "slot": {
                "start_time": (
                    slot.start_time
                    .strftime("%H:%M")
                    if slot
                    else None
                ),

                "end_time": (
                    slot.end_time
                    .strftime("%H:%M")
                    if slot
                    else None
                ),
            }
        })


    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    waiting = sum(
        1
        for item in queue_tokens
        if item.status == "waiting"
    )

    called = sum(
        1
        for item in queue_tokens
        if item.status == "called"
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
        if item.status == "completed"
    )


    return {
        "message": (
            "Today's live queue retrieved successfully"
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