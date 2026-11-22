import bcrypt
import jwt
import os

from datetime import datetime, timedelta
from functools import wraps

from flask import request


# ============================================================
# PASSWORD HELPERS
# ============================================================

def hash_password(password):
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def check_password(
    password,
    hashed_password
):
    return bcrypt.checkpw(
        password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


# ============================================================
# JWT
# ============================================================

def create_token(
    user_id,
    role
):
    payload = {
        "user_id":
            user_id,

        "role":
            role,

        "exp":
            datetime.utcnow()
            + timedelta(
                hours=24
            )
    }

    return jwt.encode(
        payload,
        os.getenv(
            "JWT_SECRET"
        ),
        algorithm="HS256"
    )


def decode_token(token):
    try:
        return jwt.decode(
            token,
            os.getenv(
                "JWT_SECRET"
            ),
            algorithms=[
                "HS256"
            ]
        )

    except jwt.InvalidTokenError:
        return None


# ============================================================
# STAFF PASSWORD CHANGE SECURITY
# ============================================================

STAFF_ROLES = {
    "doctor",
    "receptionist",
    "clinic_admin",
}


# These protected endpoints must still work while
# the staff member has a temporary password.
PASSWORD_CHANGE_ALLOWED_PATHS = {
    "/api/auth/change-password",
    "/api/auth/me",
}


def enforce_staff_password_change(
    decoded,
    user
):
    """
    Prevent Doctor/Receptionist from using protected APIs
    while their temporary password is still active.

    The user's existence, active status and role have already
    been validated by token_required() before this function
    runs.

    Returns:
        None -> request may continue

        Flask-style response tuple ->
        request must be blocked
    """

    role = decoded.get(
        "role"
    )

    # --------------------------------------------------------
    # PATIENT / ADMIN
    #
    # They do not use the temporary staff-password flow.
    # --------------------------------------------------------

    if role not in STAFF_ROLES:
        return None

    # --------------------------------------------------------
    # STAFF MUST BE ABLE TO ACCESS THESE ROUTES
    #
    # /me lets frontend inspect must_change_password.
    #
    # /change-password lets staff replace the temporary
    # password.
    # --------------------------------------------------------

    if (
        request.path
        in PASSWORD_CHANGE_ALLOWED_PATHS
    ):
        return None

    # --------------------------------------------------------
    # FORCE TEMPORARY PASSWORD CHANGE
    # --------------------------------------------------------

    if (
        user.must_change_password
        is True
    ):
        return {
            "message": (
                "You must change your temporary "
                "password before accessing "
                "SmartClinic."
            ),

            "status":
                "error",

            "code":
                "PASSWORD_CHANGE_REQUIRED",

            "must_change_password":
                True
        }, 403

    return None


# ============================================================
# TOKEN REQUIRED
# ============================================================

def token_required(f):

    @wraps(f)
    def decorated(
        *args,
        **kwargs
    ):

        auth_header = (
            request.headers.get(
                "Authorization"
            )
        )

        if not auth_header:
            return {
                "message":
                    "Authorization token is required",

                "status":
                    "error"
            }, 401

        auth_header = (
            auth_header.strip()
        )

        # ----------------------------------------------------
        # REMOVE OPTIONAL "Bearer "
        # ----------------------------------------------------

        if auth_header.lower().startswith(
            "bearer "
        ):
            token = (
                auth_header[
                    7:
                ]
                .strip()
            )

        else:
            token = (
                auth_header
            )

        if not token:
            return {
                "message":
                    "Token is missing",

                "status":
                    "error"
            }, 401

        # ----------------------------------------------------
        # VERIFY JWT SIGNATURE + EXPIRY
        # ----------------------------------------------------

        decoded = (
            decode_token(
                token
            )
        )

        if not decoded:
            return {
                "message":
                    "Invalid or expired token",

                "status":
                    "error"
            }, 401

        # ----------------------------------------------------
        # VALIDATE REQUIRED JWT CLAIMS
        # ----------------------------------------------------

        user_id = decoded.get(
            "user_id"
        )

        token_role = decoded.get(
            "role"
        )

        if (
            not user_id
            or not token_role
        ):
            return {
                "message":
                    "Invalid authentication token",

                "status":
                    "error"
            }, 401

        # ----------------------------------------------------
        # VALIDATE ACCOUNT AGAINST DATABASE
        #
        # JWT being cryptographically valid is not enough.
        #
        # This check applies to EVERY role:
        # - patient
        # - doctor
        # - receptionist
        # - admin
        # ----------------------------------------------------

        # Local imports prevent circular-import problems.
        from app import db
        from app.models.user import User

        user = db.session.get(
            User,
            user_id
        )

        if not user:
            return {
                "message":
                    "User account no longer exists",

                "status":
                    "error"
            }, 401

        # ----------------------------------------------------
        # ACCOUNT MUST STILL BE ACTIVE
        # ----------------------------------------------------

        if user.status != "active":
            return {
                "message":
                    "Account is inactive",

                "status":
                    "error"
            }, 403

        # ----------------------------------------------------
        # TOKEN ROLE MUST MATCH CURRENT DATABASE ROLE
        #
        # Prevent an old JWT from retaining permissions if
        # a user's role is ever changed in the database.
        # ----------------------------------------------------

        if user.role != token_role:
            return {
                "message": (
                    "Authentication token no longer "
                    "matches this account"
                ),

                "status":
                    "error"
            }, 401

        # ----------------------------------------------------
        # MAKE VALIDATED JWT AVAILABLE TO ROUTES
        # ----------------------------------------------------

        request.user = (
            decoded
        )

        # ----------------------------------------------------
        # FORCE STAFF TEMPORARY PASSWORD CHANGE
        # ----------------------------------------------------

        password_change_error = (
            enforce_staff_password_change(
                decoded,
                user
            )
        )

        if password_change_error:
            return password_change_error

        # ----------------------------------------------------
        # AUTHENTICATION SUCCESS
        # ----------------------------------------------------

        return f(
            *args,
            **kwargs
        )

    return decorated


# ============================================================
# ROLE REQUIRED
# ============================================================

def role_required(
    required_role
):

    def decorator(f):

        @wraps(f)
        def decorated(
            *args,
            **kwargs
        ):

            if not hasattr(
                request,
                "user"
            ):
                return {
                    "message":
                        "Authentication required",

                    "status":
                        "error"
                }, 401

            if (
                request.user.get(
                    "role"
                )
                != required_role
            ):
                return {
                    "message": (
                        "Access denied. "
                        "You do not have permission "
                        "to perform this action."
                    ),

                    "status":
                        "error"
                }, 403

            return f(
                *args,
                **kwargs
            )

        return decorated

    return decorator


def clinic_context_required(f):
    """
    Require active membership in the clinic selected by the client.

    The selected clinic ID is sent in the X-Clinic-Id request header.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(request, "user"):
            return {
                "message": "Authentication required",
                "status": "error",
            }, 401

        raw_clinic_id = request.headers.get("X-Clinic-Id")
        try:
            clinic_id = int(raw_clinic_id)
        except (TypeError, ValueError):
            return {
                "message": "Select a clinic before continuing",
                "status": "error",
            }, 400

        from app import db
        from app.models import (
            Clinic,
            ClinicStaffMembership,
            Doctor,
            DoctorClinicMembership,
        )

        clinic = db.session.get(Clinic, clinic_id)
        if not clinic or clinic.status != "active":
            return {
                "message": "Active clinic not found",
                "status": "error",
            }, 404

        user_id = request.user.get("user_id")
        role = request.user.get("role")
        membership = None

        if role == "doctor":
            doctor = Doctor.query.filter_by(
                user_id=user_id
            ).first()
            if doctor:
                membership = DoctorClinicMembership.query.filter_by(
                    doctor_id=doctor.id,
                    clinic_id=clinic_id,
                    status="active",
                ).first()
        elif role in {"clinic_admin", "receptionist"}:
            membership = ClinicStaffMembership.query.filter_by(
                user_id=user_id,
                clinic_id=clinic_id,
                staff_role=role,
                status="active",
            ).first()

        if not membership:
            return {
                "message": "You do not have active access to this clinic",
                "status": "error",
            }, 403

        request.clinic_id = clinic_id
        request.clinic = clinic
        request.clinic_membership = membership
        return f(*args, **kwargs)

    return decorated


def clinic_staff_required(
    *allowed_staff_roles
):
    """
    Require an active clinic staff membership.

    The route must provide clinic_id as a URL parameter.
    Example:
        /api/clinics/<int:clinic_id>/receptionists
    """

    def decorator(f):

        @wraps(f)
        def decorated(
            clinic_id,
            *args,
            **kwargs
        ):
            if not hasattr(
                request,
                "user"
            ):
                return {
                    "message":
                        "Authentication required",
                    "status":
                        "error"
                }, 401

            from app.models import (
                ClinicStaffMembership
            )

            user_id = request.user.get(
                "user_id"
            )

            membership = (
                ClinicStaffMembership.query
                .filter_by(
                    clinic_id=clinic_id,
                    user_id=user_id,
                    status="active"
                )
                .first()
            )

            if not membership:
                return {
                    "message": (
                        "You do not have active "
                        "access to this clinic"
                    ),
                    "status":
                        "error"
                }, 403

            if (
                allowed_staff_roles
                and membership.staff_role
                not in allowed_staff_roles
            ):
                return {
                    "message": (
                        "You do not have permission "
                        "to perform this clinic action"
                    ),
                    "status":
                        "error"
                }, 403

            request.clinic_membership = (
                membership
            )

            return f(
                clinic_id,
                *args,
                **kwargs
            )

        return decorated

    return decorator