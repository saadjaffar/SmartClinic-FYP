import hashlib
import hmac
import re
import secrets

from datetime import datetime, timedelta

from flask import Blueprint, request

from app import db
from app.models.user import User
from app.models.patient import Patient

from app.utils.auth import (
    hash_password,
    check_password,
    create_token,
    token_required,
)

from app.utils.email_service import (
    send_verification_email,
    send_password_reset_email,
    send_welcome_email,
)


# ============================================================
# EMAIL VALIDATION
# ============================================================

EMAIL_PATTERN = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+"
    r"@[A-Za-z0-9-]+"
    r"(?:\.[A-Za-z0-9-]+)+$"
)


def is_valid_email(email):
    return bool(
        EMAIL_PATTERN.fullmatch(
            email
        )
    )


# ============================================================
# PASSWORD RESET ELIGIBLE ROLES
# ============================================================

PASSWORD_RESET_ROLES = (
    "patient",
    "doctor",
    "receptionist",
)


def get_password_reset_user(
    email
):
    return (
        User.query
        .filter(
            User.email == email,
            User.role.in_(
                PASSWORD_RESET_ROLES
            )
        )
        .first()
    )


# ============================================================
# OTP
# ============================================================

def generate_verification_code():
    return str(
        secrets.randbelow(
            900000
        )
        + 100000
    )


# ============================================================
# RESET TOKEN HELPERS
# ============================================================

def generate_reset_token():
    return secrets.token_urlsafe(
        32
    )


def hash_reset_token(
    token
):
    return hashlib.sha256(
        token.encode(
            "utf-8"
        )
    ).hexdigest()


# ============================================================
# AUTH BLUEPRINT
# ============================================================

auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth",
)


# ============================================================
# REGISTER PATIENT
# ============================================================

@auth_bp.route(
    "/register",
    methods=["POST"],
)
def register():
    """
    Register a new patient and send email verification OTP
    ---
    tags:
      - Auth
    """

    data = request.get_json(
        silent=True
    )


    if not data:
        return {
            "message":
                "Request body is required",

            "status":
                "error",
        }, 400


    name = str(
        data.get(
            "name",
            ""
        )
    ).strip()


    email = str(
        data.get(
            "email",
            ""
        )
    ).strip().lower()


    contact = str(
        data.get(
            "contact",
            ""
        )
    ).strip()


    password = str(
        data.get(
            "password",
            ""
        )
    )


    gender = str(
        data.get(
            "gender",
            ""
        )
    ).strip()


    age_value = data.get(
        "age"
    )


    # --------------------------------------------------------
    # REQUIRED FIELDS
    # --------------------------------------------------------

    if (
        not name
        or not email
        or not contact
        or age_value is None
        or not gender
        or not password
    ):
        return {
            "message": (
                "Name, email, contact, age, "
                "gender and password are required"
            ),

            "status":
                "error",
        }, 400


    # --------------------------------------------------------
    # EMAIL
    # --------------------------------------------------------

    if not is_valid_email(
        email
    ):
        return {
            "message":
                "Please enter a valid email address",

            "status":
                "error",
        }, 400


    # --------------------------------------------------------
    # PASSWORD
    # --------------------------------------------------------

    if len(
        password
    ) < 8:
        return {
            "message": (
                "Password must be at least "
                "8 characters long"
            ),

            "status":
                "error",
        }, 400


    # --------------------------------------------------------
    # AGE
    # --------------------------------------------------------

    try:

        age = int(
            age_value
        )

    except (
        TypeError,
        ValueError,
    ):

        return {
            "message":
                "Age must be a valid number",

            "status":
                "error",
        }, 400


    if (
        age < 0
        or age > 120
    ):
        return {
            "message": (
                "Age must be between "
                "0 and 120"
            ),

            "status":
                "error",
        }, 400


    # --------------------------------------------------------
    # GENDER
    # --------------------------------------------------------

    if gender not in [
        "Male",
        "Female",
        "Other",
    ]:
        return {
            "message": (
                "Gender must be Male, "
                "Female or Other"
            ),

            "status":
                "error",
        }, 400


    # --------------------------------------------------------
    # DUPLICATE EMAIL
    # --------------------------------------------------------

    existing_user = (
        User.query
        .filter_by(
            email=email
        )
        .first()
    )


    if existing_user:
        return {
            "message":
                "Email already registered",

            "status":
                "error",
        }, 409


    verification_code = (
        generate_verification_code()
    )


    # --------------------------------------------------------
    # CREATE ACCOUNT
    # --------------------------------------------------------

    try:

        user = User(
            name=
                name,

            email=
                email,

            password_hash=
                hash_password(
                    password
                ),

            role=
                "patient",

            status=
                "active",

            email_verified=
                False,

            must_change_password=
                False,

            verification_code_hash=
                hash_password(
                    verification_code
                ),

            verification_expires_at=
                datetime.utcnow()
                + timedelta(
                    minutes=10
                ),

            verification_attempts=
                0,
        )


        db.session.add(
            user
        )


        db.session.flush()


        patient = Patient(
            user_id=
                user.id,

            contact=
                contact,

            age=
                age,

            gender=
                gender,
        )


        db.session.add(
            patient
        )


        db.session.commit()


    except Exception:

        db.session.rollback()


        return {
            "message":
                "Registration failed",

            "status":
                "error",
        }, 500


    # --------------------------------------------------------
    # SEND VERIFICATION EMAIL
    # --------------------------------------------------------

    try:

        send_verification_email(
            recipient_email=
                user.email,

            recipient_name=
                user.name,

            verification_code=
                verification_code,
        )


    except Exception:

        return {
            "message": (
                "Account created, but the "
                "verification email could "
                "not be sent. Please use "
                "Resend Code."
            ),

            "status":
                "success",

            "requires_verification":
                True,

            "email":
                user.email,
        }, 201


    return {
        "message": (
            "Registration successful. "
            "Please verify your email."
        ),

        "status":
            "success",

        "requires_verification":
            True,

        "email":
            user.email,
    }, 201


# ============================================================
# VERIFY EMAIL OTP
# ============================================================

@auth_bp.route(
    "/verify-email",
    methods=["POST"],
)
def verify_email():

    data = request.get_json(
        silent=True
    )


    if not data:
        return {
            "message":
                "Request body is required",

            "status":
                "error",
        }, 400


    email = str(
        data.get(
            "email",
            ""
        )
    ).strip().lower()


    code = str(
        data.get(
            "code",
            ""
        )
    ).strip()


    if (
        not email
        or not code
    ):
        return {
            "message": (
                "Email and verification "
                "code are required"
            ),

            "status":
                "error",
        }, 400


    if not re.fullmatch(
        r"\d{6}",
        code
    ):
        return {
            "message": (
                "Verification code must "
                "contain exactly 6 digits"
            ),

            "status":
                "error",
        }, 400


    user = (
        User.query
        .filter_by(
            email=email,
            role="patient",
        )
        .first()
    )


    if not user:
        return {
            "message":
                "Invalid verification request",

            "status":
                "error",
        }, 400


    if user.email_verified:
        return {
            "message":
                "Email is already verified",

            "status":
                "success",
        }, 200


    if (
        not user.verification_code_hash
        or not user.verification_expires_at
    ):
        return {
            "message": (
                "No active verification "
                "code. Please request "
                "a new code."
            ),

            "status":
                "error",
        }, 400


    if (
        user.verification_attempts
        >= 5
    ):
        return {
            "message": (
                "Too many incorrect attempts. "
                "Please request a new code."
            ),

            "status":
                "error",
        }, 429


    if (
        datetime.utcnow()
        > user.verification_expires_at
    ):
        return {
            "message": (
                "Verification code has expired. "
                "Please request a new code."
            ),

            "status":
                "error",
        }, 400


    if not check_password(
        code,
        user.verification_code_hash,
    ):

        user.verification_attempts += 1

        db.session.commit()


        return {
            "message":
                "Incorrect verification code",

            "status":
                "error",
        }, 400


    # --------------------------------------------------------
    # OTP CORRECT
    # --------------------------------------------------------

    user.email_verified = True

    user.verification_code_hash = None

    user.verification_expires_at = None

    user.verification_attempts = 0


    db.session.commit()


    # --------------------------------------------------------
    # WELCOME EMAIL
    # --------------------------------------------------------

    try:

        send_welcome_email(
            recipient_email=
                user.email,

            recipient_name=
                user.name,
        )


    except Exception as email_error:

        print(
            "Welcome email failed:",
            email_error
        )


    return {
        "message":
            "Email verified successfully",

        "status":
            "success",
    }, 200


# ============================================================
# RESEND EMAIL VERIFICATION OTP
# ============================================================

@auth_bp.route(
    "/resend-verification",
    methods=["POST"],
)
def resend_verification():

    data = request.get_json(
        silent=True
    )


    email = str(
        (data or {}).get(
            "email",
            ""
        )
    ).strip().lower()


    if not email:
        return {
            "message":
                "Email is required",

            "status":
                "error",
        }, 400


    user = (
        User.query
        .filter_by(
            email=email,
            role="patient",
        )
        .first()
    )


    if not user:
        return {
            "message": (
                "If the account exists, "
                "a verification code "
                "will be sent."
            ),

            "status":
                "success",
        }, 200


    if user.email_verified:
        return {
            "message":
                "Email is already verified",

            "status":
                "success",
        }, 200


    # --------------------------------------------------------
    # 60 SECOND COOLDOWN
    # --------------------------------------------------------

    if user.verification_expires_at:

        last_sent_at = (
            user.verification_expires_at
            - timedelta(
                minutes=10
            )
        )


        seconds_since_last_send = (
            datetime.utcnow()
            - last_sent_at
        ).total_seconds()


        if (
            seconds_since_last_send
            < 60
        ):

            retry_after = int(
                60
                - seconds_since_last_send
            ) + 1


            return {
                "message": (
                    "Please wait before "
                    "requesting another code"
                ),

                "status":
                    "error",

                "retry_after":
                    retry_after,
            }, 429


    verification_code = (
        generate_verification_code()
    )


    user.verification_code_hash = (
        hash_password(
            verification_code
        )
    )


    user.verification_expires_at = (
        datetime.utcnow()
        + timedelta(
            minutes=10
        )
    )


    user.verification_attempts = 0


    try:

        send_verification_email(
            recipient_email=
                user.email,

            recipient_name=
                user.name,

            verification_code=
                verification_code,
        )


        db.session.commit()


    except Exception:

        db.session.rollback()


        return {
            "message": (
                "Unable to send verification "
                "email right now"
            ),

            "status":
                "error",
        }, 503


    return {
        "message": (
            "A new verification code "
            "has been sent"
        ),

        "status":
            "success",
    }, 200


# ============================================================
# FORGOT PASSWORD
# PATIENT + DOCTOR + RECEPTIONIST
# ============================================================

@auth_bp.route(
    "/forgot-password",
    methods=["POST"],
)
def forgot_password():
    """
    Send password reset OTP to eligible SmartClinic account
    ---
    tags:
      - Auth
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - email
          properties:
            email:
              type: string
              format: email
              example: user@gmail.com
    responses:
      200:
        description: Reset OTP request accepted
      400:
        description: Invalid or missing email
      429:
        description: Reset code requested too soon
      503:
        description: Unable to send reset email
    """

    data = request.get_json(
        silent=True
    )


    email = str(
        (data or {}).get(
            "email",
            ""
        )
    ).strip().lower()


    if not email:
        return {
            "message":
                "Email is required",

            "status":
                "error",
        }, 400


    if not is_valid_email(
        email
    ):
        return {
            "message":
                "Please enter a valid email address",

            "status":
                "error",
        }, 400


    # --------------------------------------------------------
    # PATIENT / DOCTOR / RECEPTIONIST
    #
    # Admin is intentionally excluded.
    # Generic response protects account/role information.
    # --------------------------------------------------------

    user = (
        get_password_reset_user(
            email
        )
    )


    generic_response = {
        "message": (
            "If an eligible SmartClinic account "
            "exists for this email, a reset "
            "code will be sent."
        ),

        "status":
            "success",
    }


    if (
        not user
        or not user.email_verified
        or user.status != "active"
    ):
        return generic_response, 200


    # --------------------------------------------------------
    # 60 SECOND COOLDOWN
    # --------------------------------------------------------

    if user.password_reset_expires_at:

        last_sent_at = (
            user.password_reset_expires_at
            - timedelta(
                minutes=10
            )
        )


        seconds_since_last_send = (
            datetime.utcnow()
            - last_sent_at
        ).total_seconds()


        if (
            0
            <= seconds_since_last_send
            < 60
        ):

            retry_after = int(
                60
                - seconds_since_last_send
            ) + 1


            return {
                "message": (
                    "Please wait before "
                    "requesting another reset code"
                ),

                "status":
                    "error",

                "retry_after":
                    retry_after,
            }, 429


    reset_code = (
        generate_verification_code()
    )


    user.password_reset_code_hash = (
        hash_password(
            reset_code
        )
    )


    user.password_reset_expires_at = (
        datetime.utcnow()
        + timedelta(
            minutes=10
        )
    )


    user.password_reset_attempts = 0


    # Any old reset authorization becomes invalid.

    user.password_reset_token_hash = None

    user.password_reset_token_expires_at = None


    try:

        send_password_reset_email(
            recipient_email=
                user.email,

            recipient_name=
                user.name,

            reset_code=
                reset_code,
        )


        db.session.commit()


    except Exception:

        db.session.rollback()


        return {
            "message": (
                "Unable to send password "
                "reset email right now"
            ),

            "status":
                "error",
        }, 503


    return generic_response, 200


# ============================================================
# VERIFY PASSWORD RESET OTP
# PATIENT + DOCTOR + RECEPTIONIST
# ============================================================

@auth_bp.route(
    "/verify-reset-code",
    methods=["POST"],
)
def verify_reset_code():
    """
    Verify password-reset OTP and issue reset token
    ---
    tags:
      - Auth
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - email
            - code
          properties:
            email:
              type: string
              format: email
              example: user@gmail.com
            code:
              type: string
              example: "123456"
    responses:
      200:
        description: Reset code verified successfully
      400:
        description: Invalid, incorrect or expired reset code
      429:
        description: Too many incorrect reset attempts
    """

    data = request.get_json(
        silent=True
    )


    if not data:
        return {
            "message":
                "Request body is required",

            "status":
                "error",
        }, 400


    email = str(
        data.get(
            "email",
            ""
        )
    ).strip().lower()


    code = str(
        data.get(
            "code",
            ""
        )
    ).strip()


    if (
        not email
        or not code
    ):
        return {
            "message": (
                "Email and reset code "
                "are required"
            ),

            "status":
                "error",
        }, 400


    if not re.fullmatch(
        r"\d{6}",
        code
    ):
        return {
            "message": (
                "Reset code must contain "
                "exactly 6 digits"
            ),

            "status":
                "error",
        }, 400


    user = (
        get_password_reset_user(
            email
        )
    )


    if (
        not user
        or not user.email_verified
        or user.status != "active"
    ):
        return {
            "message":
                "Invalid or expired reset code",

            "status":
                "error",
        }, 400


    if (
        not user.password_reset_code_hash
        or not user.password_reset_expires_at
    ):
        return {
            "message": (
                "No active reset code. "
                "Please request a new code."
            ),

            "status":
                "error",
        }, 400


    if (
        user.password_reset_attempts
        >= 5
    ):
        return {
            "message": (
                "Too many incorrect attempts. "
                "Please request a new reset code."
            ),

            "status":
                "error",
        }, 429


    if (
        datetime.utcnow()
        > user.password_reset_expires_at
    ):
        return {
            "message": (
                "Reset code has expired. "
                "Please request a new code."
            ),

            "status":
                "error",
        }, 400


    if not check_password(
        code,
        user.password_reset_code_hash,
    ):

        user.password_reset_attempts += 1

        db.session.commit()


        return {
            "message":
                "Incorrect reset code",

            "status":
                "error",
        }, 400


    # --------------------------------------------------------
    # OTP CORRECT
    # --------------------------------------------------------

    reset_token = (
        generate_reset_token()
    )


    user.password_reset_code_hash = None

    user.password_reset_expires_at = None

    user.password_reset_attempts = 0


    user.password_reset_token_hash = (
        hash_reset_token(
            reset_token
        )
    )


    user.password_reset_token_expires_at = (
        datetime.utcnow()
        + timedelta(
            minutes=10
        )
    )


    db.session.commit()


    return {
        "message": (
            "Reset code verified successfully"
        ),

        "status":
            "success",

        "reset_token":
            reset_token,
    }, 200


# ============================================================
# RESET PASSWORD
# PATIENT + DOCTOR + RECEPTIONIST
# ============================================================

@auth_bp.route(
    "/reset-password",
    methods=["POST"],
)
def reset_password():
    """
    Reset password using verified reset token
    ---
    tags:
      - Auth
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - email
            - reset_token
            - new_password
          properties:
            email:
              type: string
              format: email
              example: user@gmail.com
            reset_token:
              type: string
              example: your-verified-reset-token
            new_password:
              type: string
              format: password
              example: NewPassword@123
    responses:
      200:
        description: Password reset successfully
      400:
        description: Invalid reset request or password
      500:
        description: Unable to reset password
    """

    data = request.get_json(
        silent=True
    )


    if not data:
        return {
            "message":
                "Request body is required",

            "status":
                "error",
        }, 400


    email = str(
        data.get(
            "email",
            ""
        )
    ).strip().lower()


    reset_token = str(
        data.get(
            "reset_token",
            ""
        )
    ).strip()


    new_password = str(
        data.get(
            "new_password",
            ""
        )
    )


    if (
        not email
        or not reset_token
        or not new_password
    ):
        return {
            "message": (
                "Email, reset token and "
                "new password are required"
            ),

            "status":
                "error",
        }, 400


    if len(
        new_password
    ) < 8:
        return {
            "message": (
                "Password must be at least "
                "8 characters long"
            ),

            "status":
                "error",
        }, 400


    user = (
        get_password_reset_user(
            email
        )
    )


    if (
        not user
        or not user.email_verified
        or user.status != "active"
    ):
        return {
            "message":
                "Invalid password reset request",

            "status":
                "error",
        }, 400


    if (
        not user.password_reset_token_hash
        or not user.password_reset_token_expires_at
    ):
        return {
            "message": (
                "Password reset authorization "
                "is missing or expired"
            ),

            "status":
                "error",
        }, 400


    if (
        datetime.utcnow()
        > user.password_reset_token_expires_at
    ):
        return {
            "message": (
                "Password reset authorization "
                "has expired"
            ),

            "status":
                "error",
        }, 400


    provided_token_hash = (
        hash_reset_token(
            reset_token
        )
    )


    if not hmac.compare_digest(
        provided_token_hash,
        user.password_reset_token_hash,
    ):
        return {
            "message":
                "Invalid password reset authorization",

            "status":
                "error",
        }, 400


    if check_password(
        new_password,
        user.password_hash,
    ):
        return {
            "message": (
                "New password must be different "
                "from your current password"
            ),

            "status":
                "error",
        }, 400


    try:

        user.password_hash = (
            hash_password(
                new_password
            )
        )


        user.password_reset_code_hash = None

        user.password_reset_expires_at = None

        user.password_reset_attempts = 0


        user.password_reset_token_hash = None

        user.password_reset_token_expires_at = None


        # ----------------------------------------------------
        # STAFF PASSWORD RESET
        #
        # Doctor/Receptionist has verified ownership
        # through email OTP and selected a new password,
        # therefore first-login temporary-password forcing
        # is no longer required.
        # ----------------------------------------------------

        if user.role in [
            "doctor",
            "receptionist",
        ]:

            user.must_change_password = False


        db.session.commit()


    except Exception:

        db.session.rollback()


        return {
            "message":
                "Unable to reset password",

            "status":
                "error",
        }, 500


    return {
        "message": (
            "Password reset successfully. "
            "You can now login with your "
            "new password."
        ),

        "status":
            "success",
    }, 200


# ============================================================
# STAFF - CHANGE TEMPORARY PASSWORD
# ============================================================

@auth_bp.route(
    "/change-password",
    methods=["PATCH"],
)
@token_required
def change_password():
    """
    Change temporary password for doctor or receptionist
    ---
    tags:
      - Auth
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
            - current_password
            - new_password
          properties:
            current_password:
              type: string
              format: password
            new_password:
              type: string
              format: password
    responses:
      200:
        description: Password changed successfully
      400:
        description: Invalid password
      401:
        description: Invalid current password
      403:
        description: Staff account required
    """

    user_id = request.user[
        "user_id"
    ]


    user = db.session.get(
        User,
        user_id
    )


    if not user:
        return {
            "message":
                "User not found",

            "status":
                "error",
        }, 404


    # Only Doctor and Receptionist

    if user.role not in [
        "doctor",
        "receptionist",
    ]:
        return {
            "message": (
                "Password change is only "
                "available for staff accounts"
            ),

            "status":
                "error",
        }, 403


    data = request.get_json(
        silent=True
    )


    if not data:
        return {
            "message":
                "Request body is required",

            "status":
                "error",
        }, 400


    current_password = str(
        data.get(
            "current_password",
            ""
        )
    )


    new_password = str(
        data.get(
            "new_password",
            ""
        )
    )


    if (
        not current_password
        or not new_password
    ):
        return {
            "message": (
                "Current password and "
                "new password are required"
            ),

            "status":
                "error",
        }, 400


    if len(
        new_password
    ) < 8:
        return {
            "message": (
                "New password must be at least "
                "8 characters long"
            ),

            "status":
                "error",
        }, 400


    if not check_password(
        current_password,
        user.password_hash,
    ):
        return {
            "message":
                "Current password is incorrect",

            "status":
                "error",
        }, 401


    if check_password(
        new_password,
        user.password_hash,
    ):
        return {
            "message": (
                "New password must be different "
                "from your temporary password"
            ),

            "status":
                "error",
        }, 400


    try:

        user.password_hash = (
            hash_password(
                new_password
            )
        )


        user.must_change_password = False


        db.session.commit()


    except Exception:

        db.session.rollback()


        return {
            "message":
                "Unable to change password",

            "status":
                "error",
        }, 500


    return {
        "message":
            "Password changed successfully",

        "status":
            "success",

        "must_change_password":
            False,
    }, 200


# ============================================================
# LOGIN
# ============================================================

@auth_bp.route(
    "/login",
    methods=["POST"],
)
def login():
    """
    Login to SmartClinic
    ---
    tags:
      - Auth
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
              format: email
              example: doctor@gmail.com
            password:
              type: string
              format: password
              example: YourPassword123
    responses:
      200:
        description: Login successful
      400:
        description: Email and password are required
      401:
        description: Invalid email or password
      403:
        description: Account inactive or email not verified
    """

    data = request.get_json(
        silent=True
    )


    if not data:
        return {
            "message":
                "Email and password are required",

            "status":
                "error",
        }, 400


    email = str(
        data.get(
            "email",
            ""
        )
    ).strip().lower()


    password = str(
        data.get(
            "password",
            ""
        )
    )


    if (
        not email
        or not password
    ):
        return {
            "message":
                "Email and password are required",

            "status":
                "error",
        }, 400


    user = (
        User.query
        .filter_by(
            email=email
        )
        .first()
    )


    if not user:
        return {
            "message":
                "Invalid email or password",

            "status":
                "error",
        }, 401


    if not check_password(
        password,
        user.password_hash,
    ):
        return {
            "message":
                "Invalid email or password",

            "status":
                "error",
        }, 401


    if (
        user.status
        != "active"
    ):
        return {
            "message":
                "Account is inactive",

            "status":
                "error",
        }, 403


    if (
        user.role == "patient"
        and not user.email_verified
    ):
        return {
            "message": (
                "Please verify your email "
                "before logging in"
            ),

            "status":
                "error",

            "code":
                "EMAIL_NOT_VERIFIED",

            "email":
                user.email,
        }, 403


    token = create_token(
        user.id,
        user.role,
    )


    return {
        "message":
            "Login successful",

        "status":
            "success",

        "token":
            token,

        "user": {
            "id":
                user.id,

            "name":
                user.name,

            "email":
                user.email,

            "role":
                user.role,

            "must_change_password":
                user.must_change_password,
        },
    }, 200


# ============================================================
# CURRENT USER
# ============================================================

@auth_bp.route(
    "/me",
    methods=["GET"],
)
@token_required
def me():

    user_id = request.user[
        "user_id"
    ]


    user = db.session.get(
        User,
        user_id
    )


    if not user:
        return {
            "message":
                "User not found",

            "status":
                "error",
        }, 404


    return {
        "message": (
            "User information retrieved "
            "successfully"
        ),

        "status":
            "success",

        "user": {
            "id":
                user.id,

            "name":
                user.name,

            "email":
                user.email,

            "role":
                user.role,

            "status":
                user.status,

            "email_verified":
                user.email_verified,

            "must_change_password":
                user.must_change_password,
        },
    }, 200