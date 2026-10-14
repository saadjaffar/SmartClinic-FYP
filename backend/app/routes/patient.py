from datetime import date

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


patient_bp = Blueprint(
    "patient",
    __name__,
    url_prefix="/api/patients"
)


# ============================================================
# PATIENT - CREATE PROFILE
# ============================================================

@patient_bp.route(
    "/profile",
    methods=["POST"]
)
@token_required
@role_required("patient")
def create_profile():
    """
    Create patient profile
    ---
    tags:
      - Patient
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: profile
        required: true
        schema:
          type: object
          required:
            - contact
            - age
            - gender
          properties:
            contact:
              type: string
              example: "03001234567"
            age:
              type: integer
              example: 25
            gender:
              type: string
              example: "Male"
    responses:
      201:
        description: Patient profile created successfully
      400:
        description: Invalid data
      403:
        description: Patient access required
      409:
        description: Profile already exists
    """

    user_id = request.user[
        "user_id"
    ]

    # --------------------------------------------------------
    # CHECK EXISTING PROFILE
    # --------------------------------------------------------

    existing_profile = (
        Patient.query
        .filter_by(
            user_id=user_id
        )
        .first()
    )

    if existing_profile:
        return {
            "message":
                "Patient profile already exists",
            "status":
                "error"
        }, 409

    data = request.get_json()

    if not data:
        return {
            "message":
                "Request body is required",
            "status":
                "error"
        }, 400

    contact = data.get(
        "contact"
    )

    age = data.get(
        "age"
    )

    gender = data.get(
        "gender"
    )

    if (
        not contact
        or age is None
        or not gender
    ):
        return {
            "message": (
                "contact, age and gender "
                "are required"
            ),
            "status":
                "error"
        }, 400

    # --------------------------------------------------------
    # AGE VALIDATION
    # --------------------------------------------------------

    if (
        not isinstance(
            age,
            int
        )
        or age < 0
        or age > 120
    ):
        return {
            "message": (
                "Age must be a valid number "
                "between 0 and 120"
            ),
            "status":
                "error"
        }, 400

    # --------------------------------------------------------
    # GENDER VALIDATION
    # --------------------------------------------------------

    if gender not in [
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

    try:
        patient = Patient(
            user_id=user_id,
            contact=contact,
            age=age,
            gender=gender
        )

        db.session.add(
            patient
        )

        db.session.commit()

        return {
            "message":
                "Patient profile created successfully",

            "status":
                "success",

            "patient": {
                "id":
                    patient.id,

                "user_id":
                    patient.user_id,

                "contact":
                    patient.contact,

                "age":
                    patient.age,

                "gender":
                    patient.gender
            }
        }, 201

    except Exception as e:
        db.session.rollback()

        return {
            "message":
                "Failed to create patient profile",

            "status":
                "error",

            "error":
                str(e)
        }, 500


# ============================================================
# PATIENT - GET PROFILE
# ============================================================

@patient_bp.route(
    "/profile",
    methods=["GET"]
)
@token_required
@role_required("patient")
def get_profile():
    """
    Get own patient profile
    ---
    tags:
      - Patient
    security:
      - Bearer: []
    responses:
      200:
        description: Patient profile retrieved successfully
      404:
        description: Patient profile not found
      403:
        description: Patient access required
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

    return {
        "message":
            "Patient profile retrieved successfully",

        "status":
            "success",

        "patient": {
            "id":
                patient.id,

            "user_id":
                patient.user_id,

            "contact":
                patient.contact,

            "age":
                patient.age,

            "gender":
                patient.gender
        }
    }, 200


# ============================================================
# PATIENT - UPDATE PROFILE
# ============================================================

@patient_bp.route(
    "/profile",
    methods=["PUT"]
)
@token_required
@role_required("patient")
def update_profile():
    """
    Update own patient profile
    ---
    tags:
      - Patient
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: profile
        required: true
        schema:
          type: object
          properties:
            contact:
              type: string
              example: "03001234567"
            age:
              type: integer
              example: 26
            gender:
              type: string
              example: "Male"
    responses:
      200:
        description: Patient profile updated successfully
      400:
        description: Invalid data
      404:
        description: Patient profile not found
      403:
        description: Patient access required
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

    data = request.get_json()

    if not data:
        return {
            "message":
                "Request body is required",
            "status":
                "error"
        }, 400

    # --------------------------------------------------------
    # CONTACT
    # --------------------------------------------------------

    if "contact" in data:
        patient.contact = data[
            "contact"
        ]

    # --------------------------------------------------------
    # AGE
    # --------------------------------------------------------

    if "age" in data:
        age = data[
            "age"
        ]

        if (
            not isinstance(
                age,
                int
            )
            or age < 0
            or age > 120
        ):
            return {
                "message": (
                    "Age must be a valid number "
                    "between 0 and 120"
                ),
                "status":
                    "error"
            }, 400

        patient.age = age

    # --------------------------------------------------------
    # GENDER
    # --------------------------------------------------------

    if "gender" in data:
        gender = data[
            "gender"
        ]

        if gender not in [
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

        patient.gender = gender

    try:
        db.session.commit()

        return {
            "message":
                "Patient profile updated successfully",

            "status":
                "success",

            "patient": {
                "id":
                    patient.id,

                "user_id":
                    patient.user_id,

                "contact":
                    patient.contact,

                "age":
                    patient.age,

                "gender":
                    patient.gender
            }
        }, 200

    except Exception as e:
        db.session.rollback()

        return {
            "message":
                "Failed to update patient profile",

            "status":
                "error",

            "error":
                str(e)
        }, 500


# ============================================================
# PATIENT - DASHBOARD
# ============================================================

@patient_bp.route(
    "/dashboard",
    methods=["GET"]
)
@token_required
@role_required("patient")
def patient_dashboard():
    """
    Get patient dashboard
    ---
    tags:
      - Patient
    security:
      - Bearer: []
    responses:
      200:
        description: Patient dashboard retrieved successfully
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

    today = date.today()

    # --------------------------------------------------------
    # GET ACTIVE APPOINTMENT FOR TODAY
    #
    # Scheduled appointments have an AppointmentSlot.
    # Emergency walk-ins have slot_id = NULL.
    #
    # OUTER JOIN is therefore required.
    #
    # An active emergency walk-in is shown before a normal
    # scheduled appointment because it represents the
    # patient's current live clinic visit.
    # --------------------------------------------------------

    appointment = (
        Appointment.query
        .outerjoin(
            AppointmentSlot,
            Appointment.slot_id
            == AppointmentSlot.id
        )
        .filter(
            Appointment.patient_id
            == patient.id,

            Appointment.appointment_date
            == today,

            Appointment.status.in_([
                "pending",
                "confirmed",
                "in_progress"
            ])
        )
        .order_by(
            (
                Appointment.booking_source
                == "walk_in"
            ).desc(),

            AppointmentSlot
            .start_time
            .asc(),

            Appointment
            .created_at
            .asc()
        )
        .first()
    )

    today_appointment = None
    queue_info = None

    if appointment:

        # ----------------------------------------------------
        # DOCTOR
        # ----------------------------------------------------

        doctor = db.session.get(
            Doctor,
            appointment.doctor_id
        )

        doctor_name = None
        specialization = None
        room_number = None

        if doctor:
            doctor_user = db.session.get(
                User,
                doctor.user_id
            )

            if doctor_user:
                doctor_name = (
                    doctor_user.name
                )

            specialization = (
                doctor.specialization
            )

            room_number = (
                doctor.room_number
            )

        # ----------------------------------------------------
        # SLOT
        #
        # Walk-in appointment has no slot.
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
                appointment_id=
                    appointment.id
            )
            .first()
        )

        # ----------------------------------------------------
        # APPOINTMENT RESPONSE
        # ----------------------------------------------------

        today_appointment = {
            "appointment_id":
                appointment.id,

            "doctor_id":
                appointment.doctor_id,

            "doctor_name":
                doctor_name,

            "specialization":
                specialization,

            "room_number":
                room_number,

            "appointment_date": (
                appointment
                .appointment_date
                .isoformat()
            ),

            "slot_id":
                appointment.slot_id,

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

            "emergency_reason": (
                appointment.notes
                if (
                    appointment.booking_source
                    == "walk_in"
                )
                else None
            ),

            "status":
                appointment.status,

            "queue_token": (
                queue.token_number
                if queue
                else None
            )
        }

        # ----------------------------------------------------
        # QUEUE INFORMATION
        # ----------------------------------------------------

        if queue:

            # ------------------------------------------------
            # PRIORITY-AWARE PEOPLE AHEAD
            #
            # URGENT PATIENT:
            # Only earlier urgent patients are ahead.
            #
            # NORMAL PATIENT:
            # All urgent patients are ahead, plus earlier
            # normal-token patients.
            # ------------------------------------------------

            if queue.priority == "urgent":

                priority_filter = and_(
                    QueueToken.priority
                    == "urgent",

                    QueueToken.token_number
                    < queue.token_number
                )

            else:

                priority_filter = or_(
                    QueueToken.priority
                    == "urgent",

                    and_(
                        QueueToken.priority
                        == "normal",

                        QueueToken.token_number
                        < queue.token_number
                    )
                )

            waiting_ahead = (
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

                    QueueToken.status.in_([
                        "waiting",
                        "called",
                        "in_consultation"
                    ]),

                    priority_filter
                )
                .count()
            )

            # ------------------------------------------------
            # CURRENT PATIENT BEING SERVED
            # ------------------------------------------------

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

                    QueueToken.status.in_([
                        "called",
                        "in_consultation"
                    ])
                )
                .order_by(
                    QueueToken
                    .priority
                    .desc(),

                    QueueToken
                    .token_number
                    .asc()
                )
                .first()
            )

            queue_info = {
                "queue_id":
                    queue.id,

                "token_number":
                    queue.token_number,

                "status":
                    queue.status,

                "priority":
                    queue.priority,

                "people_ahead":
                    waiting_ahead,

                "now_serving": (
                    current_queue.token_number
                    if current_queue
                    else None
                )
            }

    # --------------------------------------------------------
    # PATIENT USER
    # --------------------------------------------------------

    patient_user = db.session.get(
        User,
        user_id
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message":
            "Patient dashboard retrieved successfully",

        "status":
            "success",

        "patient": {
            "id":
                patient.id,

            "name": (
                patient_user.name
                if patient_user
                else None
            )
        },

        "today_appointment":
            today_appointment,

        "queue":
            queue_info
    }, 200