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
}


# These protected endpoints must still work while
# the staff member has a temporary password.
PASSWORD_CHANGE_ALLOWED_PATHS = {
    "/api/auth/change-password",
    "/api/auth/me",
}


def enforce_staff_password_change(
    decoded
):
    """
    Prevent Doctor/Receptionist from using protected APIs
    while their temporary password is still active.

    Returns:
        None -> request may continue

        Flask-style response tuple ->
        request must be blocked
    """

    role = decoded.get(
        "role"
    )


    # Patients/Admin do not use the temporary
    # staff-password flow.
    if role not in STAFF_ROLES:
        return None


    # Staff must be able to access these routes
    # before changing the temporary password.
    if (
        request.path
        in PASSWORD_CHANGE_ALLOWED_PATHS
    ):
        return None


    user_id = decoded.get(
        "user_id"
    )


    if not user_id:
        return {
            "message":
                "Invalid authentication token",

            "status":
                "error"
        }, 401


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


    if user.status != "active":
        return {
            "message":
                "Account is inactive",

            "status":
                "error"
        }, 403


    if (
        user.role in STAFF_ROLES
        and user.must_change_password
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
        # VERIFY JWT
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


        # Make decoded JWT available to routes.
        request.user = (
            decoded
        )


        # ----------------------------------------------------
        # FORCE STAFF TEMPORARY PASSWORD CHANGE
        # ----------------------------------------------------

        password_change_error = (
            enforce_staff_password_change(
                decoded
            )
        )


        if password_change_error:
            return password_change_error


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