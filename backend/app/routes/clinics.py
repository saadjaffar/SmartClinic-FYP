import hashlib
import re
import secrets
from datetime import date, datetime, timedelta

from flask import Blueprint, current_app, request
from sqlalchemy import and_, or_

from app import db
from app.models.appointment import Appointment
from app.models.appointment_slot import AppointmentSlot
from app.models.clinic import Clinic
from app.models.clinic_staff_membership import ClinicStaffMembership
from app.models.doctor import Doctor
from app.models.doctor_clinic_membership import DoctorClinicMembership
from app.models.queue_token import QueueToken
from app.models.user import User
from app.utils.auth import (
    hash_password,
    role_required,
    token_required,
)
from app.utils.email_service import (
    send_clinic_admin_account_email,
    send_doctor_clinic_invitation_email,
    send_staff_account_created_email,
)


clinic_bp = Blueprint(
    "clinics",
    __name__,
    url_prefix="/api/clinics"
)

EMAIL_PATTERN = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+"
    r"@[A-Za-z0-9-]+"
    r"(?:\.[A-Za-z0-9-]+)+$"
)


def _email_is_valid(email):
    return bool(EMAIL_PATTERN.fullmatch(email))


def _membership_payload(membership):
    return {
        "id": membership.id,
        "clinic_id": membership.clinic_id,
        "clinic_name": membership.clinic.name,
        "status": membership.status,
        "duty_status": membership.duty_status,
        "room_number": membership.room_number,
    }


@clinic_bp.route("", methods=["GET"])
@token_required
@role_required("admin")
def list_clinics():
    clinics = Clinic.query.order_by(Clinic.name.asc()).all()

    return {
        "status": "success",
        "clinics": [
            {
                "id": clinic.id,
                "name": clinic.name,
                "address": clinic.address,
                "contact": clinic.contact,
                "email": clinic.email,
                "status": clinic.status,
            }
            for clinic in clinics
        ],
    }, 200


@clinic_bp.route("/<int:clinic_id>/status", methods=["PATCH"])
@token_required
@role_required("admin")
def update_clinic_status(clinic_id):
    data = request.get_json(silent=True) or {}
    requested_status = str(data.get("status", "")).strip().lower()

    if requested_status not in {"active", "inactive"}:
        return {
            "message": "status must be active or inactive",
            "status": "error",
        }, 400

    clinic = (
        Clinic.query
        .filter_by(id=clinic_id)
        .with_for_update()
        .first()
    )
    if not clinic:
        return {
            "message": "Clinic not found",
            "status": "error",
        }, 404

    if requested_status == clinic.status:
        return {
            "message": f"Clinic is already {requested_status}",
            "status": "success",
            "clinic": {
                "id": clinic.id,
                "name": clinic.name,
                "status": clinic.status,
            },
        }, 200

    if requested_status == "inactive":
        today = date.today()
        unresolved_appointments = Appointment.query.filter(
            Appointment.clinic_id == clinic_id,
            Appointment.status.in_(["pending", "confirmed", "in_progress"]),
            or_(
                Appointment.appointment_date >= today,
                Appointment.status == "in_progress",
            ),
        ).count()
        active_queue_entries = (
            QueueToken.query
            .join(Appointment, QueueToken.appointment_id == Appointment.id)
            .filter(
                Appointment.clinic_id == clinic_id,
                QueueToken.status.in_(
                    ["waiting", "called", "in_consultation"]
                ),
            )
            .count()
        )

        if unresolved_appointments or active_queue_entries:
            db.session.rollback()
            return {
                "message": (
                    "Clinic cannot be deactivated while it has "
                    "upcoming or in-progress appointments, or an active queue"
                ),
                "status": "error",
                "unresolved_appointments": unresolved_appointments,
                "active_queue_entries": active_queue_entries,
            }, 409

    clinic.status = requested_status
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Failed to update clinic status for clinic_id=%s",
            clinic_id,
        )
        return {
            "message": "Unable to update clinic status",
            "status": "error",
        }, 500

    return {
        "message": f"Clinic {requested_status} successfully",
        "status": "success",
        "clinic": {
            "id": clinic.id,
            "name": clinic.name,
            "status": clinic.status,
        },
    }, 200


@clinic_bp.route("", methods=["POST"])
@token_required
@role_required("admin")
def create_clinic():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    clinic_admin_name = str(
        data.get("clinic_admin_name", "")
    ).strip()
    clinic_admin_email = str(
        data.get("clinic_admin_email", "")
    ).strip().lower()
    temporary_password = str(
        data.get("temporary_password", "")
    )
    address = str(data.get("address", "")).strip() or None
    contact = str(data.get("contact", "")).strip() or None
    email = str(data.get("email", "")).strip().lower() or None

    if not name or not clinic_admin_name or not clinic_admin_email:
        return {
            "message": (
                "Clinic name and the first Clinic Admin's "
                "name and email are required"
            ),
            "status": "error",
        }, 400

    if not _email_is_valid(clinic_admin_email):
        return {
            "message": "Please enter a valid Clinic Admin email",
            "status": "error",
        }, 400

    if len(temporary_password) < 8:
        return {
            "message": (
                "Clinic Admin temporary password must be at least "
                "8 characters long"
            ),
            "status": "error",
        }, 400

    existing_user = User.query.filter(
        db.func.lower(User.email) == clinic_admin_email
    ).first()

    if existing_user:
        return {
            "message": (
                "A SmartClinic account already uses the "
                "Clinic Admin email"
            ),
            "status": "error",
        }, 409

    clinic = Clinic(
        name=name,
        address=address,
        contact=contact,
        email=email,
        status="active",
    )

    clinic_admin = User(
        name=clinic_admin_name,
        email=clinic_admin_email,
        password_hash=hash_password(temporary_password),
        role="clinic_admin",
        status="active",
        must_change_password=True,
        email_verified=True,
        verification_attempts=0,
    )

    try:
        db.session.add(clinic)
        db.session.flush()
        db.session.add(clinic_admin)
        db.session.flush()
        db.session.add(
            ClinicStaffMembership(
                clinic_id=clinic.id,
                user_id=clinic_admin.id,
                staff_role="clinic_admin",
                status="active",
            )
        )
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to create clinic and Clinic Admin")
        return {
            "message": "Failed to create clinic",
            "status": "error",
        }, 500

    email_sent = True
    try:
        send_clinic_admin_account_email(
            recipient_email=clinic_admin.email,
            recipient_name=clinic_admin.name,
            clinic_name=clinic.name,
            temporary_password=temporary_password,
        )
    except Exception:
        email_sent = False
        current_app.logger.exception(
            "Clinic Admin account email failed for user_id=%s",
            clinic_admin.id,
        )

    return {
        "message": (
            "Clinic and Clinic Admin created successfully"
            if email_sent
            else (
                "Clinic and Clinic Admin were created, but the "
                "account email could not be sent"
            )
        ),
        "status": "success",
        "email_sent": email_sent,
        "clinic": {
            "id": clinic.id,
            "name": clinic.name,
            "status": clinic.status,
        },
        "clinic_admin": {
            "id": clinic_admin.id,
            "name": clinic_admin.name,
            "email": clinic_admin.email,
        },
    }, 201


@clinic_bp.route("/my", methods=["GET"])
@token_required
def list_my_clinics():
    user_id = request.user["user_id"]
    role = request.user.get("role")

    if role == "doctor":
        memberships = (
            DoctorClinicMembership.query
            .join(Clinic)
            .filter(
                DoctorClinicMembership.doctor.has(
                    Doctor.user_id == user_id
                ),
                DoctorClinicMembership.status == "active",
                Clinic.status == "active",
            )
            .order_by(Clinic.name.asc())
            .all()
        )
        clinics = [
            {
                **_membership_payload(membership),
                "role": "doctor",
            }
            for membership in memberships
        ]
    else:
        memberships = (
            ClinicStaffMembership.query
            .join(Clinic)
            .filter(
                ClinicStaffMembership.user_id == user_id,
                ClinicStaffMembership.status == "active",
                Clinic.status == "active",
            )
            .order_by(Clinic.name.asc())
            .all()
        )
        clinics = [
            {
                "clinic_id": membership.clinic_id,
                "clinic_name": membership.clinic.name,
                "status": membership.status,
                "role": membership.staff_role,
            }
            for membership in memberships
        ]

    return {
        "status": "success",
        "clinics": clinics,
    }, 200


@clinic_bp.route(
    "/<int:clinic_id>/doctors",
    methods=["POST"]
)
@token_required
@role_required("clinic_admin")
def invite_doctor_to_clinic(clinic_id):
    clinic = db.session.get(Clinic, clinic_id)
    if not clinic or clinic.status != "active":
        return {
            "message": "Active clinic not found",
            "status": "error",
        }, 404

    admin_membership = ClinicStaffMembership.query.filter_by(
        clinic_id=clinic_id,
        user_id=request.user["user_id"],
        staff_role="clinic_admin",
        status="active",
    ).first()
    if not admin_membership:
        return {
            "message": "You do not administer this clinic",
            "status": "error",
        }, 403

    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    specialization = str(data.get("specialization", "")).strip()
    license_number = str(data.get("license_number", "")).strip() or None
    room_number = str(data.get("room_number", "")).strip() or None
    temporary_password = str(data.get("temporary_password", ""))

    if not email:
        return {
            "message": "Doctor email is required",
            "status": "error",
        }, 400
    if not _email_is_valid(email):
        return {
            "message": "Please enter a valid doctor email",
            "status": "error",
        }, 400

    user = User.query.filter(
        db.func.lower(User.email) == email
    ).first()

    if user:
        if user.role != "doctor" or not user.doctor_profile:
            return {
                "message": (
                    "This email belongs to an account that is "
                    "not a doctor"
                ),
                "status": "error",
            }, 409
        doctor = user.doctor_profile
        if (
            specialization
            and doctor.specialization.lower() != specialization.lower()
        ):
            return {
                "message": (
                    "The email belongs to a doctor profile with a "
                    "different specialization"
                ),
                "status": "error",
            }, 409
        if temporary_password:
            return {
                "message": (
                    "Do not enter a new password for an existing "
                    "doctor account"
                ),
                "status": "error",
            }, 400
        existing_membership = DoctorClinicMembership.query.filter_by(
            doctor_id=doctor.id,
            clinic_id=clinic_id,
        ).first()
        if existing_membership:
            return {
                "message": (
                    "This doctor already has a clinic association "
                    f"with status '{existing_membership.status}'"
                ),
                "status": "error",
            }, 409
        is_new_doctor = False
    else:
        if not name or not specialization:
            return {
                "message": (
                    "Name and specialization are required to create "
                    "a new doctor account"
                ),
                "status": "error",
            }, 400
        if len(temporary_password) < 8:
            return {
                "message": (
                    "A temporary password of at least 8 characters "
                    "is required for a new doctor account"
                ),
                "status": "error",
            }, 400
        doctor_user = User(
            name=name,
            email=email,
            password_hash=hash_password(temporary_password),
            role="doctor",
            status="active",
            must_change_password=True,
            email_verified=True,
            verification_attempts=0,
        )
        doctor = Doctor(
            user=doctor_user,
            specialization=specialization,
            license_number=license_number,
            room_number=room_number,
            duty_status="off_duty",
        )
        db.session.add(doctor_user)
        db.session.add(doctor)
        is_new_doctor = True

    raw_token = secrets.token_urlsafe(32)
    membership = DoctorClinicMembership(
        doctor=doctor,
        clinic_id=clinic_id,
        status="pending",
        duty_status="off_duty",
        room_number=room_number,
        invitation_token_hash=hashlib.sha256(
            raw_token.encode("utf-8")
        ).hexdigest(),
        invitation_expires_at=datetime.utcnow() + timedelta(days=7),
    )

    try:
        db.session.add(membership)
        db.session.flush()
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Failed to create doctor invitation for clinic_id=%s",
            clinic_id,
        )
        return {
            "message": (
                "Doctor invitation could not be created"
            ),
            "status": "error",
        }, 500

    email_sent = True
    try:
        send_doctor_clinic_invitation_email(
            recipient_email=email,
            recipient_name=name if is_new_doctor else doctor.user.name,
            clinic_name=clinic.name,
            approval_url=(
                f"{current_app.config['APP_BASE_URL'].rstrip('/')}"
                f"/doctor-invitation?token={raw_token}"
            ),
            temporary_password=(
                temporary_password if is_new_doctor else None
            ),
        )
    except Exception:
        email_sent = False
        current_app.logger.exception(
            "Doctor clinic invitation email failed for membership_id=%s",
            membership.id,
        )

    return {
        "message": (
            "Doctor account and approval invitation created"
            if email_sent and is_new_doctor
            else (
                "Approval invitation sent to the existing doctor"
                if email_sent
                else (
                    "Doctor association was created, but the "
                    "invitation email could not be sent"
                )
            )
        ),
        "status": "success",
        "email_sent": email_sent,
        "membership": {
            "id": membership.id,
            "doctor_id": doctor.id,
            "clinic_id": clinic.id,
            "clinic_name": clinic.name,
            "status": membership.status,
        },
    }, 201


@clinic_bp.route(
    "/<int:clinic_id>/receptionists",
    methods=["POST"]
)
@token_required
@role_required("clinic_admin")
def add_receptionist_to_clinic(clinic_id):
    clinic = db.session.get(Clinic, clinic_id)
    if not clinic or clinic.status != "active":
        return {
            "message": "Active clinic not found",
            "status": "error",
        }, 404

    admin_membership = ClinicStaffMembership.query.filter_by(
        clinic_id=clinic_id,
        user_id=request.user["user_id"],
        staff_role="clinic_admin",
        status="active",
    ).first()
    if not admin_membership:
        return {
            "message": "You do not administer this clinic",
            "status": "error",
        }, 403

    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    temporary_password = str(data.get("temporary_password", ""))

    if not name or not email or not _email_is_valid(email):
        return {
            "message": "A valid name and email are required",
            "status": "error",
        }, 400

    user = User.query.filter(
        db.func.lower(User.email) == email
    ).first()
    is_new_user = user is None

    if user and user.role != "receptionist":
        return {
            "message": "This email belongs to a non-receptionist account",
            "status": "error",
        }, 409

    if is_new_user and len(temporary_password) < 8:
        return {
            "message": (
                "A temporary password of at least 8 characters "
                "is required for a new receptionist"
            ),
            "status": "error",
        }, 400

    if not is_new_user and temporary_password:
        return {
            "message": (
                "Do not enter a new password for an existing "
                "receptionist account"
            ),
            "status": "error",
        }, 400

    if is_new_user:
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(temporary_password),
            role="receptionist",
            status="active",
            must_change_password=True,
            email_verified=True,
            verification_attempts=0,
        )
        db.session.add(user)
        db.session.flush()

    existing_membership = ClinicStaffMembership.query.filter_by(
        clinic_id=clinic_id,
        user_id=user.id,
    ).first()
    if existing_membership:
        db.session.rollback()
        return {
            "message": (
                "This receptionist already has a membership "
                f"with status '{existing_membership.status}'"
            ),
            "status": "error",
        }, 409

    active_membership_elsewhere = (
        ClinicStaffMembership.query
        .join(Clinic)
        .filter(
            ClinicStaffMembership.user_id == user.id,
            ClinicStaffMembership.status == "active",
            ClinicStaffMembership.clinic_id != clinic_id,
            Clinic.status == "active",
        )
        .first()
    )
    if active_membership_elsewhere:
        db.session.rollback()
        return {
            "message": (
                "A receptionist can only be active at one clinic. "
                "Deactivate their other clinic membership first."
            ),
            "status": "error",
        }, 409

    membership = ClinicStaffMembership(
        clinic_id=clinic_id,
        user_id=user.id,
        staff_role="receptionist",
        status="active",
    )
    db.session.add(membership)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Failed to add receptionist to clinic_id=%s",
            clinic_id,
        )
        return {
            "message": "Failed to add receptionist",
            "status": "error",
        }, 500

    email_sent = True
    if is_new_user:
        try:
            send_staff_account_created_email(
                recipient_email=user.email,
                recipient_name=user.name,
                role="receptionist",
            )
        except Exception:
            email_sent = False
            current_app.logger.exception(
                "Receptionist account email failed for user_id=%s",
                user.id,
            )

    return {
        "message": (
            "Receptionist added to clinic successfully"
            if email_sent
            else (
                "Receptionist was added, but the account "
                "notification email could not be sent"
            )
        ),
        "status": "success",
        "email_sent": email_sent,
        "membership": {
            "id": membership.id,
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "clinic_id": clinic.id,
            "clinic_name": clinic.name,
        },
    }, 201


@clinic_bp.route(
    "/<int:clinic_id>/staff",
    methods=["GET"]
)
@token_required
@role_required("clinic_admin")
def list_clinic_staff(clinic_id):
    clinic = db.session.get(Clinic, clinic_id)
    if not clinic or clinic.status != "active":
        return {
            "message": "Active clinic not found",
            "status": "error",
        }, 404

    admin_membership = ClinicStaffMembership.query.filter_by(
        clinic_id=clinic_id,
        user_id=request.user["user_id"],
        staff_role="clinic_admin",
        status="active",
    ).first()
    if not admin_membership:
        return {
            "message": "You do not administer this clinic",
            "status": "error",
        }, 403

    doctor_memberships = (
        DoctorClinicMembership.query
        .join(Doctor)
        .join(User)
        .filter(DoctorClinicMembership.clinic_id == clinic_id)
        .order_by(User.name.asc())
        .all()
    )
    receptionist_memberships = (
        ClinicStaffMembership.query
        .join(User)
        .filter(
            ClinicStaffMembership.clinic_id == clinic_id,
            ClinicStaffMembership.staff_role == "receptionist",
        )
        .order_by(User.name.asc())
        .all()
    )

    doctor_ids = [
        membership.doctor_id
        for membership in doctor_memberships
    ]
    upcoming_appointments = {}
    if doctor_ids:
        today = date.today()
        now = datetime.now()
        appointment_counts = (
            db.session.query(
                Appointment.doctor_id,
                db.func.count(Appointment.id),
            )
            .outerjoin(
                AppointmentSlot,
                Appointment.slot_id == AppointmentSlot.id,
            )
            .filter(
                Appointment.clinic_id == clinic_id,
                Appointment.doctor_id.in_(doctor_ids),
                Appointment.status.in_(
                    ("pending", "confirmed", "in_progress")
                ),
                or_(
                    Appointment.appointment_date > today,
                    and_(
                        Appointment.appointment_date == today,
                        or_(
                            Appointment.status == "in_progress",
                            AppointmentSlot.id.is_(None),
                            AppointmentSlot.start_time > now.time(),
                        ),
                    ),
                ),
            )
            .group_by(Appointment.doctor_id)
            .all()
        )
        upcoming_appointments = dict(appointment_counts)

    staff = [
        {
            "membership_id": membership.id,
            "user_id": membership.doctor.user_id,
            "role": "doctor",
            "name": membership.doctor.user.name,
            "email": membership.doctor.user.email,
            "status": membership.status,
            "account_status": membership.doctor.user.status,
            "duty_status": membership.duty_status,
            "room_number": membership.room_number,
            "upcoming_appointments": upcoming_appointments.get(
                membership.doctor_id,
                0,
            ),
        }
        for membership in doctor_memberships
    ]
    staff.extend(
        {
            "membership_id": membership.id,
            "user_id": membership.user_id,
            "role": "receptionist",
            "name": membership.user.name,
            "email": membership.user.email,
            "status": membership.status,
            "account_status": membership.user.status,
            "duty_status": None,
            "room_number": None,
            "upcoming_appointments": 0,
        }
        for membership in receptionist_memberships
    )

    return {
        "status": "success",
        "clinic": {
            "id": clinic.id,
            "name": clinic.name,
        },
        "staff": staff,
    }, 200


@clinic_bp.route(
    "/<int:clinic_id>/staff/<string:staff_role>/<int:membership_id>/status",
    methods=["PATCH"]
)
@token_required
@role_required("clinic_admin")
def update_clinic_staff_status(clinic_id, staff_role, membership_id):
    if staff_role not in {"doctor", "receptionist"}:
        return {
            "message": "Only doctors and receptionists can be managed here",
            "status": "error",
        }, 400

    clinic = db.session.get(Clinic, clinic_id)
    if not clinic or clinic.status != "active":
        return {
            "message": "Active clinic not found",
            "status": "error",
        }, 404

    admin_membership = ClinicStaffMembership.query.filter_by(
        clinic_id=clinic_id,
        user_id=request.user["user_id"],
        staff_role="clinic_admin",
        status="active",
    ).first()
    if not admin_membership:
        return {
            "message": "You do not administer this clinic",
            "status": "error",
        }, 403

    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status", "")).strip().lower()
    if new_status not in {"active", "inactive"}:
        return {
            "message": "status must be active or inactive",
            "status": "error",
        }, 400

    if staff_role == "doctor":
        membership = DoctorClinicMembership.query.filter_by(
            id=membership_id,
            clinic_id=clinic_id,
        ).with_for_update().first()
        if not membership:
            return {
                "message": "Doctor clinic membership not found",
                "status": "error",
            }, 404
        if membership.status not in {"active", "inactive"}:
            return {
                "message": (
                    "Only approved doctor memberships can be activated "
                    "or deactivated"
                ),
                "status": "error",
            }, 409
        user = membership.doctor.user
    else:
        membership = ClinicStaffMembership.query.filter_by(
            id=membership_id,
            clinic_id=clinic_id,
            staff_role="receptionist",
        ).with_for_update().first()
        if not membership:
            return {
                "message": "Receptionist clinic membership not found",
                "status": "error",
            }, 404
        user = membership.user

    if new_status == "active" and user.status != "active":
        return {
            "message": (
                "This account is globally inactive. Ask the Super Admin "
                "to reactivate the account before enabling this clinic."
            ),
            "status": "error",
        }, 409

    if (
        staff_role == "receptionist"
        and new_status == "active"
        and ClinicStaffMembership.query
        .join(Clinic)
        .filter(
            ClinicStaffMembership.user_id == user.id,
            ClinicStaffMembership.status == "active",
            ClinicStaffMembership.clinic_id != clinic_id,
            Clinic.status == "active",
        )
        .first()
    ):
        return {
            "message": (
                "A receptionist can only be active at one clinic. "
                "Deactivate their other clinic membership first."
            ),
            "status": "error",
        }, 409

    if staff_role == "doctor" and new_status == "inactive":
        today = date.today()
        now = datetime.now()
        upcoming_count = (
            db.session.query(db.func.count(Appointment.id))
            .outerjoin(
                AppointmentSlot,
                Appointment.slot_id == AppointmentSlot.id,
            )
            .filter(
                Appointment.clinic_id == clinic_id,
                Appointment.doctor_id == membership.doctor_id,
                Appointment.status.in_(
                    ("pending", "confirmed", "in_progress")
                ),
                or_(
                    Appointment.appointment_date > today,
                    and_(
                        Appointment.appointment_date == today,
                        or_(
                            Appointment.status == "in_progress",
                            AppointmentSlot.id.is_(None),
                            AppointmentSlot.start_time > now.time(),
                        ),
                    ),
                ),
            )
            .scalar()
        )
        if upcoming_count:
            return {
                "message": (
                    "This doctor has upcoming or active appointments at "
                    "this clinic. Complete or reschedule them before "
                    "deactivation."
                ),
                "status": "error",
                "upcoming_appointments": upcoming_count,
            }, 409

    membership.status = new_status
    if staff_role == "doctor" and new_status == "inactive":
        membership.duty_status = "off_duty"

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Failed to update clinic staff membership clinic_id=%s "
            "membership_id=%s",
            clinic_id,
            membership_id,
        )
        return {
            "message": "Failed to update clinic staff status",
            "status": "error",
        }, 500

    return {
        "message": (
            f"{staff_role.capitalize()} "
            f"{'activated' if new_status == 'active' else 'deactivated'} "
            f"for this clinic"
        ),
        "status": "success",
        "staff": {
            "membership_id": membership.id,
            "user_id": user.id,
            "role": staff_role,
            "status": membership.status,
            "account_status": user.status,
            "duty_status": (
                membership.duty_status
                if staff_role == "doctor"
                else None
            ),
        },
    }, 200


def _find_pending_invitation(raw_token):
    token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()

    return DoctorClinicMembership.query.filter_by(
        invitation_token_hash=token_hash,
        status="pending",
    ).first()


@clinic_bp.route(
    "/invitations/preview",
    methods=["POST"]
)
def preview_doctor_invitation():
    data = request.get_json(silent=True) or {}
    raw_token = str(data.get("token", "")).strip()
    if not raw_token:
        return {
            "message": "Invitation token is required",
            "status": "error",
        }, 400

    membership = _find_pending_invitation(raw_token)
    if (
        not membership
        or not membership.invitation_expires_at
        or membership.invitation_expires_at <= datetime.utcnow()
    ):
        return {
            "message": "Invitation is invalid or has expired",
            "status": "error",
        }, 400

    return {
        "status": "success",
        "clinic": {
            "id": membership.clinic.id,
            "name": membership.clinic.name,
        },
        "doctor_name": membership.doctor.user.name,
    }, 200


@clinic_bp.route(
    "/invitations/approve",
    methods=["POST"]
)
def approve_doctor_invitation():
    data = request.get_json(silent=True) or {}
    raw_token = str(data.get("token", "")).strip()
    if not raw_token:
        return {
            "message": "Invitation token is required",
            "status": "error",
        }, 400

    membership = (
        DoctorClinicMembership.query
        .filter_by(
            invitation_token_hash=hashlib.sha256(
                raw_token.encode("utf-8")
            ).hexdigest(),
            status="pending",
        )
        .with_for_update()
        .first()
    )
    if (
        not membership
        or not membership.invitation_expires_at
        or membership.invitation_expires_at <= datetime.utcnow()
    ):
        db.session.rollback()
        return {
            "message": "Invitation is invalid or has expired",
            "status": "error",
        }, 400

    membership.status = "active"
    membership.approved_at = datetime.utcnow()
    membership.invitation_token_hash = None
    membership.invitation_expires_at = None

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Doctor clinic invitation approval failed"
        )
        return {
            "message": "Unable to approve clinic invitation",
            "status": "error",
        }, 500

    return {
        "message": "Clinic invitation approved successfully",
        "status": "success",
        "clinic": {
            "id": membership.clinic.id,
            "name": membership.clinic.name,
        },
    }, 200
