from flask import Blueprint, request

from app import db
from app.models.consultation import Consultation
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.queue_token import QueueToken
from app.models.user import User
from datetime import datetime, timezone
from app.utils.auth import token_required, role_required

def utc_iso(value):
    if value is None:
        return None

    return (
        value
        .replace(tzinfo=timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )


consultation_bp = Blueprint(
    "consultation",
    __name__,
    url_prefix="/api/consultations"
)


# ============================================================
# DOCTOR - SAVE CONSULTATION
# ============================================================

@consultation_bp.route("", methods=["POST"])
@token_required
@role_required("doctor")
def create_consultation():
    """
    Save consultation details
    ---
    tags:
      - Consultation
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: consultation
        required: true
        schema:
          type: object
          required:
            - queue_id
          properties:
            queue_id:
              type: integer
              example: 1
            chief_complaint:
              type: string
              example: Fever and headache for two days
            diagnosis:
              type: string
              example: Viral infection
            prescription:
              type: string
              example: Paracetamol 500mg twice daily
            doctor_notes:
              type: string
              example: Patient advised to rest and drink plenty of fluids
    responses:
      201:
        description: Consultation saved successfully
      400:
        description: Invalid request or consultation state
      401:
        description: Unauthorized
      403:
        description: Doctor access required or access denied
      404:
        description: Doctor, queue or appointment not found
      409:
        description: Consultation already exists
    """

    user_id = request.user["user_id"]

    # Find doctor profile
    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message": "Doctor profile not found",
            "status": "error"
        }, 404

    data = request.get_json()

    if not data:
        return {
            "message": "Request body is required",
            "status": "error"
        }, 400

    queue_id = data.get("queue_id")

    if not queue_id:
        return {
            "message": "queue_id is required",
            "status": "error"
        }, 400

    # Find queue token
    queue = db.session.get(
        QueueToken,
        queue_id
    )

    if not queue:
        return {
            "message": "Queue token not found",
            "status": "error"
        }, 404

    # Make sure this queue belongs to logged-in doctor
    if queue.doctor_id != doctor.id:
        return {
            "message": "Access denied",
            "status": "error"
        }, 403

    # Consultation can only be saved after Start Consultation
    if queue.status != "in_consultation":
        return {
            "message": "Patient is not currently in consultation",
            "status": "400"
        }, 400

    # Find appointment
    appointment = db.session.get(
        Appointment,
        queue.appointment_id
    )

    if not appointment:
        return {
            "message": "Appointment not found",
            "status": "error"
        }, 404

    # Check if consultation already exists
    existing = Consultation.query.filter_by(
        appointment_id=appointment.id
    ).first()

    if existing:
        return {
            "message": "Consultation already exists for this appointment",
            "status": "error",
            "consultation_id": existing.id
        }, 409

    # Create consultation
    consultation = Consultation(
        appointment_id=appointment.id,
        patient_id=queue.patient_id,
        doctor_id=doctor.id,
        chief_complaint=data.get("chief_complaint"),
        diagnosis=data.get("diagnosis"),
        prescription=data.get("prescription"),
        doctor_notes=data.get("doctor_notes"),
        started_at=queue.consultation_started_at
    )

    try:
        db.session.add(consultation)
        db.session.commit()

        return {
            "message": "Consultation saved successfully",
            "status": "success",
            "consultation": {
                "id": consultation.id,
                "appointment_id": consultation.appointment_id,
                "patient_id": consultation.patient_id,
                "doctor_id": consultation.doctor_id,
                "chief_complaint": consultation.chief_complaint,
                "diagnosis": consultation.diagnosis,
                "prescription": consultation.prescription,
                "doctor_notes": consultation.doctor_notes,
                "started_at": (
                    consultation.started_at.isoformat()
                    if consultation.started_at else None
                )
            }
        }, 201

    except Exception as e:
        db.session.rollback()

        return {
            "message": "Failed to save consultation",
            "status": "error",
            "error": str(e)
        }, 500


# ============================================================
# DOCTOR - GET CONSULTATION
# ============================================================

@consultation_bp.route("/<int:consultation_id>", methods=["GET"])
@token_required
def get_consultation(consultation_id):
    """
    Get consultation details
    ---
    tags:
      - Consultation
    security:
      - Bearer: []
    parameters:
      - in: path
        name: consultation_id
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Consultation retrieved successfully
      401:
        description: Unauthorized
      403:
        description: Access denied
      404:
        description: Consultation not found
    """

    consultation = db.session.get(
        Consultation,
        consultation_id
    )

    if not consultation:
        return {
            "message": "Consultation not found",
            "status": "error"
        }, 404

    user_id = request.user["user_id"]
    role = request.user.get("role")

    # ----------------------------------------
    # Doctor access
    # ----------------------------------------

    if role == "doctor":

        doctor = Doctor.query.filter_by(
            user_id=user_id
        ).first()

        if not doctor:
            return {
                "message": "Doctor profile not found",
                "status": "error"
            }, 404

        if consultation.doctor_id != doctor.id:
            return {
                "message": "Access denied",
                "status": "error"
            }, 403

    # ----------------------------------------
    # Patient access
    # ----------------------------------------

    elif role == "patient":

        patient = Patient.query.filter_by(
            user_id=user_id
        ).first()

        if not patient:
            return {
                "message": "Patient profile not found",
                "status": "error"
            }, 404

        if consultation.patient_id != patient.id:
            return {
                "message": "Access denied",
                "status": "error"
            }, 403

    else:

        return {
            "message": "Access denied",
            "status": "error"
        }, 403

    return {
        "message": "Consultation retrieved successfully",
        "status": "success",
        "consultation": {
            "id": consultation.id,
            "appointment_id": consultation.appointment_id,
            "patient_id": consultation.patient_id,
            "doctor_id": consultation.doctor_id,
            "chief_complaint": consultation.chief_complaint,
            "diagnosis": consultation.diagnosis,
            "prescription": consultation.prescription,
            "doctor_notes": consultation.doctor_notes,
            "started_at": utc_iso(
            consultation.started_at
            ),

            "ended_at": utc_iso(
            consultation.ended_at
            ),
            "duration_minutes": (
                float(consultation.duration_minutes)
                if consultation.duration_minutes is not None
                else None
            ),
            "created_at": (
                consultation.created_at.isoformat()
                if consultation.created_at else None
            )
        }
    }, 200


# ============================================================
# PATIENT - MY MEDICAL HISTORY
# ============================================================

@consultation_bp.route("/my", methods=["GET"])
@token_required
@role_required("patient")
def my_consultations():
    """
    Get patient's medical history
    ---
    tags:
      - Consultation
    security:
      - Bearer: []
    responses:
      200:
        description: Medical history retrieved successfully
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

    consultations = Consultation.query.filter_by(
        patient_id=patient.id
    ).order_by(
        Consultation.created_at.desc()
    ).all()

    result = []

    for consultation in consultations:

        doctor = db.session.get(
            Doctor,
            consultation.doctor_id
        )

        doctor_name = None

        if doctor:
            doctor_user = db.session.get(
                User,
                doctor.user_id
            )

            if doctor_user:
                doctor_name = doctor_user.name

        result.append({
            "id": consultation.id,
            "appointment_id": consultation.appointment_id,
            "doctor_id": consultation.doctor_id,
            "doctor_name": doctor_name,
            "chief_complaint": consultation.chief_complaint,
            "diagnosis": consultation.diagnosis,
            "prescription": consultation.prescription,
            "doctor_notes": consultation.doctor_notes,
            "started_at": utc_iso(
            consultation.started_at
            ),

            "ended_at": utc_iso(
            consultation.ended_at
            ),
            "duration_minutes": (
                float(consultation.duration_minutes)
                if consultation.duration_minutes is not None
                else None
            ),
            "created_at": (
                consultation.created_at.isoformat()
                if consultation.created_at else None
            )
        })

    return {
        "message": "Medical history retrieved successfully",
        "status": "success",
        "count": len(result),
        "consultations": result
    }, 200