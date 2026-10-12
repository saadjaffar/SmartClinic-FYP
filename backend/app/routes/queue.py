from datetime import date, datetime

from flask import Blueprint, request

from app import db
from app.models.appointment import Appointment
from app.models.appointment_slot import AppointmentSlot
from app.models.consultation import Consultation
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.queue_token import QueueToken
from app.models.user import User
from app.utils.auth import (
    role_required,
    token_required,
)


queue_bp = Blueprint(
    "queue",
    __name__,
    url_prefix="/api/queue"
)


# ============================================================
# DOCTOR - GET TODAY'S CHECKED-IN QUEUE
# ============================================================

@queue_bp.route(
    "/today",
    methods=["GET"]
)
@token_required
@role_required("doctor")
def get_today_queue():
    user_id = request.user[
        "user_id"
    ]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message":
                "Doctor profile not found",
            "status": "error"
        }, 404


    today = date.today()


    # Doctor should only see patients
    # who have actually arrived/check-in.
    queue = (
        QueueToken.query
        .join(
            Appointment,
            QueueToken.appointment_id
            == Appointment.id
        )
        .filter(
            QueueToken.doctor_id
            == doctor.id,

            Appointment.appointment_date
            == today,

            QueueToken.check_in_time
            .isnot(None)
        )
        .order_by(
            QueueToken.priority.desc(),
            QueueToken.token_number.asc()
        )
        .all()
    )


    result = []


    for token in queue:

        patient = db.session.get(
            Patient,
            token.patient_id
        )

        patient_user = None

        if patient:
            patient_user = db.session.get(
                User,
                patient.user_id
            )


        appointment = db.session.get(
            Appointment,
            token.appointment_id
        )


        slot = None

        if appointment:
            slot = db.session.get(
                AppointmentSlot,
                appointment.slot_id
            )


        result.append({
            "id": token.id,

            "appointment_id":
                token.appointment_id,

            "token_number":
                token.token_number,

            "patient_id":
                token.patient_id,

            "patient_name": (
                patient_user.name
                if patient_user
                else None
            ),

            "priority":
                token.priority,

            "status":
                token.status,

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

            "notes": (
                appointment.notes
                if appointment
                else None
            ),

            "appointment_date": (
                appointment
                .appointment_date
                .isoformat()
                if appointment
                else None
            ),

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
            ),

            "checked_in": bool(
                token.check_in_time
            ),

            "check_in_time": (
                token.check_in_time
                .isoformat()
                if token.check_in_time
                else None
            ),

            "called_at": (
                token.called_at
                .isoformat()
                if token.called_at
                else None
            ),

            "consultation_started_at": (
                token
                .consultation_started_at
                .isoformat()
                if token
                .consultation_started_at
                else None
            ),

            "completed_at": (
                token.completed_at
                .isoformat()
                if token.completed_at
                else None
            ),
        })


    return {
        "message":
            "Queue retrieved successfully",
        "status": "success",
        "date": today.isoformat(),
        "count": len(result),
        "queue": result
    }, 200


# ============================================================
# PATIENT - GET OWN QUEUE STATUS
# ============================================================

@queue_bp.route(
    "/my",
    methods=["GET"]
)
@token_required
@role_required("patient")
def get_my_queue_status():
    user_id = request.user[
        "user_id"
    ]

    patient = Patient.query.filter_by(
        user_id=user_id
    ).first()

    if not patient:
        return {
            "message":
                "Patient profile not found",
            "status": "error"
        }, 404


    today = date.today()


    appointment = (
        Appointment.query
        .join(
            AppointmentSlot,
            Appointment.slot_id
            == AppointmentSlot.id
        )
        .filter(
            Appointment.patient_id
            == patient.id,

            Appointment.appointment_date
            >= today,

            Appointment.status.in_([
                "pending",
                "confirmed",
                "in_progress",
            ])
        )
        .order_by(
            Appointment
            .appointment_date
            .asc(),

            AppointmentSlot
            .start_time
            .asc()
        )
        .first()
    )


    if not appointment:
        return {
            "message":
                "No active appointment found",
            "status": "success",
            "appointment": None,
            "queue": None
        }, 200


    # --------------------------------------------------------
    # DOCTOR
    # --------------------------------------------------------

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


    # --------------------------------------------------------
    # SLOT
    # --------------------------------------------------------

    slot = db.session.get(
        AppointmentSlot,
        appointment.slot_id
    )


    # --------------------------------------------------------
    # QUEUE
    # --------------------------------------------------------

    queue = (
        QueueToken.query
        .filter_by(
            appointment_id=
                appointment.id
        )
        .first()
    )


    appointment_info = {
        "id":
            appointment.id,

        "doctor_id":
            appointment.doctor_id,

        "doctor_name": (
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

        "appointment_date":
            appointment
            .appointment_date
            .isoformat(),

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

        "status":
            appointment.status,
    }


    if not queue:
        return {
            "message":
                "Queue token not found for appointment",
            "status": "success",
            "appointment":
                appointment_info,
            "queue": None
        }, 200


    is_today = (
        appointment.appointment_date
        == today
    )

    checked_in = bool(
        queue.check_in_time
    )

    people_ahead = None
    now_serving = None


    # --------------------------------------------------------
    # LIVE QUEUE INFO
    # --------------------------------------------------------

    if (
        is_today
        and checked_in
    ):

        people_ahead = (
            QueueToken.query
            .join(
                Appointment,
                QueueToken.appointment_id
                == Appointment.id
            )
            .filter(
                QueueToken.doctor_id
                == queue.doctor_id,

                Appointment.appointment_date
                == today,

                QueueToken.check_in_time
                .isnot(None),

                QueueToken.token_number
                < queue.token_number,

                QueueToken.status.in_([
                    "waiting",
                    "called",
                    "in_consultation",
                ])
            )
            .count()
        )


        current_queue = (
            QueueToken.query
            .join(
                Appointment,
                QueueToken.appointment_id
                == Appointment.id
            )
            .filter(
                QueueToken.doctor_id
                == queue.doctor_id,

                Appointment.appointment_date
                == today,

                QueueToken.check_in_time
                .isnot(None),

                QueueToken.status.in_([
                    "called",
                    "in_consultation",
                ])
            )
            .order_by(
                QueueToken
                .token_number
                .asc()
            )
            .first()
        )


        if current_queue:
            now_serving = (
                current_queue
                .token_number
            )


    queue_info = {
        "id":
            queue.id,

        "token_number":
            queue.token_number,

        "status":
            queue.status,

        "priority":
            queue.priority,

        "queue_active": (
            is_today
            and checked_in
        ),

        "checked_in":
            checked_in,

        "people_ahead":
            people_ahead,

        "now_serving":
            now_serving,

        "check_in_time": (
            queue.check_in_time
            .isoformat()
            if queue.check_in_time
            else None
        ),

        "called_at": (
            queue.called_at
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
            queue.completed_at
            .isoformat()
            if queue.completed_at
            else None
        ),
    }


    return {
        "message":
            "Queue status retrieved successfully",
        "status": "success",
        "appointment":
            appointment_info,
        "queue":
            queue_info
    }, 200


# ============================================================
# DOCTOR - CALL NEXT PATIENT
# ============================================================

@queue_bp.route(
    "/call-next",
    methods=["POST"]
)
@token_required
@role_required("doctor")
def call_next():
    user_id = request.user[
        "user_id"
    ]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message":
                "Doctor profile not found",
            "status": "error"
        }, 404


    today = date.today()


    # --------------------------------------------------------
    # DO NOT ALLOW MULTIPLE ACTIVE PATIENTS
    # --------------------------------------------------------

    current = (
        QueueToken.query
        .join(
            Appointment,
            QueueToken.appointment_id
            == Appointment.id
        )
        .filter(
            QueueToken.doctor_id
            == doctor.id,

            Appointment.appointment_date
            == today,

            QueueToken.status.in_([
                "called",
                "in_consultation",
            ])
        )
        .first()
    )


    if current:
        return {
            "message":
                "Please complete the current patient first",
            "status": "error"
        }, 400


    # --------------------------------------------------------
    # NEXT PATIENT MUST BE CHECKED IN
    # --------------------------------------------------------

    next_patient = (
        QueueToken.query
        .join(
            Appointment,
            QueueToken.appointment_id
            == Appointment.id
        )
        .filter(
            QueueToken.doctor_id
            == doctor.id,

            Appointment.appointment_date
            == today,

            Appointment.status.in_([
                "pending",
                "confirmed",
            ]),

            QueueToken.status
            == "waiting",

            QueueToken.check_in_time
            .isnot(None)
        )
        .order_by(
            QueueToken.priority.desc(),
            QueueToken.token_number.asc()
        )
        .first()
    )


    if not next_patient:
        return {
            "message":
                "No checked-in patients are waiting today",
            "status": "error"
        }, 404


    try:
        next_patient.status = (
            "called"
        )

        next_patient.called_at = (
            datetime.utcnow()
        )

        db.session.commit()


        return {
            "message":
                "Next patient called successfully",
            "status": "success",
            "date":
                today.isoformat(),
            "queue_id":
                next_patient.id,
            "token_number":
                next_patient.token_number
        }, 200


    except Exception:
        db.session.rollback()

        return {
            "message":
                "Failed to call next patient",
            "status": "error"
        }, 500


# ============================================================
# DOCTOR - START CONSULTATION
# ============================================================

@queue_bp.route(
    "/<int:queue_id>/start",
    methods=["PATCH"]
)
@token_required
@role_required("doctor")
def start_consultation(
    queue_id
):
    user_id = request.user[
        "user_id"
    ]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message":
                "Doctor profile not found",
            "status": "error"
        }, 404


    queue = db.session.get(
        QueueToken,
        queue_id
    )

    if not queue:
        return {
            "message":
                "Queue token not found",
            "status": "error"
        }, 404


    if (
        queue.doctor_id
        != doctor.id
    ):
        return {
            "message":
                "Access denied",
            "status": "error"
        }, 403


    appointment = db.session.get(
        Appointment,
        queue.appointment_id
    )

    if not appointment:
        return {
            "message":
                "Appointment not found",
            "status": "error"
        }, 404


    if (
        appointment.appointment_date
        != date.today()
    ):
        return {
            "message":
                "Only today's appointment can be started",
            "status": "error"
        }, 400


    if not queue.check_in_time:
        return {
            "message":
                "Patient must be checked in first",
            "status": "error"
        }, 400


    if (
        queue.status
        != "called"
    ):
        return {
            "message":
                "Only a called patient can start consultation",
            "status": "error"
        }, 400


    if appointment.status not in [
        "pending",
        "confirmed",
    ]:
        return {
            "message":
                "This appointment cannot start consultation",
            "status": "error"
        }, 400


    try:
        started_at = (
            datetime.utcnow()
        )

        queue.status = (
            "in_consultation"
        )

        queue.consultation_started_at = (
            started_at
        )

        appointment.status = (
            "in_progress"
        )

        db.session.commit()


        return {
            "message":
                "Consultation started successfully",
            "status": "success"
        }, 200


    except Exception:
        db.session.rollback()

        return {
            "message":
                "Failed to start consultation",
            "status": "error"
        }, 500


# ============================================================
# DOCTOR - COMPLETE CONSULTATION
# ============================================================

@queue_bp.route(
    "/<int:queue_id>/complete",
    methods=["PATCH"]
)
@token_required
@role_required("doctor")
def complete_queue(
    queue_id
):
    user_id = request.user[
        "user_id"
    ]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message":
                "Doctor profile not found",
            "status": "error"
        }, 404


    queue = db.session.get(
        QueueToken,
        queue_id
    )

    if not queue:
        return {
            "message":
                "Queue token not found",
            "status": "error"
        }, 404


    if (
        queue.doctor_id
        != doctor.id
    ):
        return {
            "message":
                "Access denied",
            "status": "error"
        }, 403


    appointment = db.session.get(
        Appointment,
        queue.appointment_id
    )

    if not appointment:
        return {
            "message":
                "Appointment not found",
            "status": "error"
        }, 404


    if (
        appointment.appointment_date
        != date.today()
    ):
        return {
            "message":
                "Only today's appointment can be completed",
            "status": "error"
        }, 400


    if (
        queue.status
        != "in_consultation"
    ):
        return {
            "message":
                "Patient is not currently in consultation",
            "status": "error"
        }, 400


    if (
        appointment.status
        != "in_progress"
    ):
        return {
            "message":
                "Appointment is not currently in progress",
            "status": "error"
        }, 400


    consultation = (
        Consultation.query
        .filter_by(
            appointment_id=
                appointment.id
        )
        .first()
    )


    if not consultation:
        return {
            "message":
                "Please save consultation details before completing the patient",
            "status": "error"
        }, 400


    try:
        completed_at = (
            datetime.utcnow()
        )

        queue.status = (
            "completed"
        )

        queue.completed_at = (
            completed_at
        )

        appointment.status = (
            "completed"
        )

        consultation.ended_at = (
            completed_at
        )


        if consultation.started_at:
            duration_seconds = (
                consultation.ended_at
                - consultation.started_at
            ).total_seconds()

            consultation.duration_minutes = round(
                duration_seconds / 60,
                2
            )


        db.session.commit()


        return {
            "message":
                "Patient consultation completed",
            "status": "success"
        }, 200


    except Exception:
        db.session.rollback()

        return {
            "message":
                "Failed to complete consultation",
            "status": "error"
        }, 500


# ============================================================
# DOCTOR - SKIP / NO SHOW
# ============================================================

@queue_bp.route(
    "/<int:queue_id>/skip",
    methods=["PATCH"]
)
@token_required
@role_required("doctor")
def skip_queue(
    queue_id
):
    user_id = request.user[
        "user_id"
    ]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message":
                "Doctor profile not found",
            "status": "error"
        }, 404


    queue = db.session.get(
        QueueToken,
        queue_id
    )

    if not queue:
        return {
            "message":
                "Queue token not found",
            "status": "error"
        }, 404


    if (
        queue.doctor_id
        != doctor.id
    ):
        return {
            "message":
                "Access denied",
            "status": "error"
        }, 403


    appointment = db.session.get(
        Appointment,
        queue.appointment_id
    )

    if not appointment:
        return {
            "message":
                "Appointment not found",
            "status": "error"
        }, 404


    if (
        appointment.appointment_date
        != date.today()
    ):
        return {
            "message":
                "Only today's patient can be skipped",
            "status": "error"
        }, 400


    if (
        queue.status
        not in [
            "waiting",
            "called",
        ]
    ):
        return {
            "message":
                "This patient cannot be skipped",
            "status": "error"
        }, 400


    if (
        appointment.status
        not in [
            "pending",
            "confirmed",
        ]
    ):
        return {
            "message":
                "This appointment cannot be marked as no-show",
            "status": "error"
        }, 400


    try:
        queue.status = (
            "skipped"
        )

        appointment.status = (
            "no_show"
        )

        db.session.commit()


        return {
            "message":
                "Patient skipped successfully",
            "status": "success"
        }, 200


    except Exception:
        db.session.rollback()

        return {
            "message":
                "Failed to skip patient",
            "status": "error"
        }, 500