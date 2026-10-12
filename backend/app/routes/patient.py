from flask import Blueprint, request

from app import db
from app.models.patient import Patient
from app.utils.auth import token_required, role_required

from app.models.appointment import Appointment
from app.models.appointment_slot import AppointmentSlot
from app.models.queue_token import QueueToken
from app.models.doctor import Doctor
from app.models.user import User
from datetime import date

patient_bp = Blueprint(
    "patient",
    __name__,
    url_prefix="/api/patients"
)


@patient_bp.route("/profile", methods=["POST"])
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

    user_id = request.user["user_id"]

    # Check existing profile
    existing_profile = Patient.query.filter_by(
        user_id=user_id
    ).first()

    if existing_profile:
        return {
            "message": "Patient profile already exists",
            "status": "error"
        }, 409

    data = request.get_json()

    if not data:
        return {
            "message": "Request body is required",
            "status": "error"
        }, 400

    contact = data.get("contact")
    age = data.get("age")
    gender = data.get("gender")

    if not contact or age is None or not gender:
        return {
            "message": "contact, age and gender are required",
            "status": "error"
        }, 400

    # Validate age
    if not isinstance(age, int) or age < 0 or age > 120:
        return {
            "message": "Age must be a valid number between 0 and 120",
            "status": "error"
        }, 400

    # Validate gender
    if gender not in ["Male", "Female", "Other"]:
        return {
            "message": "Gender must be Male, Female or Other",
            "status": "error"
        }, 400

    try:

        patient = Patient(
            user_id=user_id,
            contact=contact,
            age=age,
            gender=gender
        )

        db.session.add(patient)
        db.session.commit()

        return {
            "message": "Patient profile created successfully",
            "status": "success",
            "patient": {
                "id": patient.id,
                "user_id": patient.user_id,
                "contact": patient.contact,
                "age": patient.age,
                "gender": patient.gender
            }
        }, 201

    except Exception as e:

        db.session.rollback()

        return {
            "message": "Failed to create patient profile",
            "status": "error",
            "error": str(e)
        }, 500


@patient_bp.route("/profile", methods=["GET"])
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

    user_id = request.user["user_id"]

    patient = Patient.query.filter_by(
        user_id=user_id
    ).first()

    if not patient:
        return {
            "message": "Patient profile not found",
            "status": "error"
        }, 404

    return {
        "message": "Patient profile retrieved successfully",
        "status": "success",
        "patient": {
            "id": patient.id,
            "user_id": patient.user_id,
            "contact": patient.contact,
            "age": patient.age,
            "gender": patient.gender
        }
    }, 200


@patient_bp.route("/profile", methods=["PUT"])
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

    user_id = request.user["user_id"]

    patient = Patient.query.filter_by(
        user_id=user_id
    ).first()

    if not patient:
        return {
            "message": "Patient profile not found",
            "status": "error"
        }, 404

    data = request.get_json()

    if not data:
        return {
            "message": "Request body is required",
            "status": "error"
        }, 400

    if "contact" in data:
        patient.contact = data["contact"]

    if "age" in data:

        age = data["age"]

        if not isinstance(age, int) or age < 0 or age > 120:
            return {
                "message": "Age must be a valid number between 0 and 120",
                "status": "error"
            }, 400

        patient.age = age

    if "gender" in data:

        gender = data["gender"]

        if gender not in ["Male", "Female", "Other"]:
            return {
                "message": "Gender must be Male, Female or Other",
                "status": "error"
            }, 400

        patient.gender = gender

    try:

        db.session.commit()

        return {
            "message": "Patient profile updated successfully",
            "status": "success",
            "patient": {
                "id": patient.id,
                "user_id": patient.user_id,
                "contact": patient.contact,
                "age": patient.age,
                "gender": patient.gender
            }
        }, 200

    except Exception as e:

        db.session.rollback()

        return {
            "message": "Failed to update patient profile",
            "status": "error",
            "error": str(e)
        }, 500


@patient_bp.route("/dashboard", methods=["GET"])
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

    user_id = request.user["user_id"]

    patient = Patient.query.filter_by(
        user_id=user_id
    ).first()

    if not patient:
        return {
            "message": "Patient profile not found",
            "status": "error"
        }, 404

    today = date.today()

    # Get nearest active appointment for TODAY,
    # ordered by actual appointment time.
    appointment = (
        Appointment.query
        .join(
            AppointmentSlot,
            Appointment.slot_id == AppointmentSlot.id
        )
        .filter(
            Appointment.patient_id == patient.id,
            Appointment.appointment_date == today,
            Appointment.status.in_([
                "pending",
                "confirmed",
                "in_progress"
            ])
        )
        .order_by(
            AppointmentSlot.start_time.asc()
        )
        .first()
    )

    today_appointment = None
    queue_info = None

    if appointment:

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
                doctor_name = doctor_user.name

            specialization = doctor.specialization
            room_number = doctor.room_number

        slot = db.session.get(
            AppointmentSlot,
            appointment.slot_id
        )

        queue = QueueToken.query.filter_by(
            appointment_id=appointment.id
        ).first()

        today_appointment = {
            "appointment_id": appointment.id,
            "doctor_id": appointment.doctor_id,
            "doctor_name": doctor_name,
            "specialization": specialization,
            "room_number": room_number,

            "appointment_date": (
                appointment.appointment_date.isoformat()
            ),

            "appointment_time": (
                slot.start_time.strftime("%H:%M")
                if slot else None
            ),

            "appointment_end_time": (
                slot.end_time.strftime("%H:%M")
                if slot else None
            ),

            "appointment_type": appointment.appointment_type,
            "status": appointment.status,

            "queue_token": (
                queue.token_number
                if queue else None
            )
        }

        if queue:

            # Count only patients belonging to
            # this doctor AND this appointment date.
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

                    QueueToken.token_number
                    < queue.token_number,

                    QueueToken.status.in_([
                        "waiting",
                        "called",
                        "in_consultation"
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

                    QueueToken.status.in_([
                        "called",
                        "in_consultation"
                    ])
                )
                .order_by(
                    QueueToken.token_number
                )
                .first()
            )

            queue_info = {
                "queue_id": queue.id,
                "token_number": queue.token_number,
                "status": queue.status,
                "priority": queue.priority,
                "people_ahead": waiting_ahead,

                "now_serving": (
                    current_queue.token_number
                    if current_queue else None
                )
            }

    patient_user = db.session.get(
        User,
        user_id
    )

    return {
        "message": "Patient dashboard retrieved successfully",
        "status": "success",

        "patient": {
            "id": patient.id,

            "name": (
                patient_user.name
                if patient_user else None
            )
        },

        "today_appointment": today_appointment,
        "queue": queue_info
    }, 200