import re

from flask import Blueprint, request

from app import db
from app.models.doctor import Doctor
from app.models.user import User

from app.utils.auth import (
    hash_password,
    role_required,
    token_required
)

from app.utils.email_service import (
    send_staff_account_created_email
)


admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api/admin"
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
# ADMIN DASHBOARD
# ============================================================

@admin_bp.route(
    "/dashboard",
    methods=["GET"]
)
@token_required
@role_required("admin")
def admin_dashboard():
    """
    Get admin dashboard statistics
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: Admin dashboard retrieved successfully
      403:
        description: Admin access required
    """

    total_users = (
        User.query.count()
    )

    total_patients = (
        User.query
        .filter_by(
            role="patient"
        )
        .count()
    )

    total_doctors = (
        User.query
        .filter_by(
            role="doctor"
        )
        .count()
    )

    total_receptionists = (
        User.query
        .filter_by(
            role="receptionist"
        )
        .count()
    )

    active_users = (
        User.query
        .filter_by(
            status="active"
        )
        .count()
    )

    inactive_users = (
        User.query
        .filter_by(
            status="inactive"
        )
        .count()
    )

    doctors_on_duty = (
        Doctor.query
        .filter_by(
            duty_status="on_duty"
        )
        .count()
    )

    doctors_off_duty = (
        Doctor.query
        .filter_by(
            duty_status="off_duty"
        )
        .count()
    )

    return {
        "message": (
            "Admin dashboard retrieved successfully"
        ),
        "status":
            "success",
        "stats": {
            "total_users":
                total_users,
            "patients":
                total_patients,
            "doctors":
                total_doctors,
            "receptionists":
                total_receptionists,
            "active_users":
                active_users,
            "inactive_users":
                inactive_users,
            "doctors_on_duty":
                doctors_on_duty,
            "doctors_off_duty":
                doctors_off_duty
        }
    }, 200


# ============================================================
# ADMIN - GET DOCTORS
# ============================================================

@admin_bp.route(
    "/doctors",
    methods=["GET"]
)
@token_required
@role_required("admin")
def get_doctors():
    """
    Get all doctors
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: Doctors retrieved successfully
      403:
        description: Admin access required
    """

    doctors = (
        Doctor.query
        .join(
            User,
            Doctor.user_id
            == User.id
        )
        .order_by(
            User.name.asc()
        )
        .all()
    )

    result = []

    for doctor in doctors:

        user = db.session.get(
            User,
            doctor.user_id
        )

        if not user:
            continue

        result.append({
            "doctor_id":
                doctor.id,
            "user_id":
                user.id,
            "name":
                user.name,
            "email":
                user.email,
            "status":
                user.status,
            "email_verified":
                user.email_verified,
            "must_change_password":
                user.must_change_password,
            "specialization":
                doctor.specialization,
            "license_number":
                doctor.license_number,
            "room_number":
                doctor.room_number,
            "working_hours":
                doctor.working_hours,
            "duty_status":
                doctor.duty_status,
            "created_at": (
                user.created_at.isoformat()
                if user.created_at
                else None
            )
        })

    return {
        "message": (
            "Doctors retrieved successfully"
        ),
        "status":
            "success",
        "count":
            len(result),
        "doctors":
            result
    }, 200


# ============================================================
# ADMIN - CREATE DOCTOR
# ============================================================

@admin_bp.route(
    "/doctors",
    methods=["POST"]
)
@token_required
@role_required("admin")
def create_doctor():
    """
    Create a new doctor account
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: doctor
        required: true
        schema:
          type: object
          required:
            - name
            - email
            - password
            - specialization
          properties:
            name:
              type: string
              example: Dr. Ahmed Khan
            email:
              type: string
              format: email
              example: doctorname@gmail.com
            password:
              type: string
              format: password
              example: DoctorTemp@123
            specialization:
              type: string
              example: Cardiology
            license_number:
              type: string
              example: PMC-12345
            room_number:
              type: string
              example: Room 101
            working_hours:
              type: string
              example: 9 AM - 5 PM
            duty_status:
              type: string
              example: off_duty
    responses:
      201:
        description: Doctor created successfully
      400:
        description: Invalid request
      403:
        description: Admin access required
      409:
        description: Email already exists
    """

    data = request.get_json(
        silent=True
    )

    if not data:
        return {
            "message": (
                "Request body is required"
            ),
            "status":
                "error"
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

    password = str(
        data.get(
            "password",
            ""
        )
    )

    specialization = str(
        data.get(
            "specialization",
            ""
        )
    ).strip()

    license_number = str(
        data.get(
            "license_number",
            ""
        )
    ).strip() or None

    room_number = str(
        data.get(
            "room_number",
            ""
        )
    ).strip() or None

    working_hours = str(
        data.get(
            "working_hours",
            ""
        )
    ).strip() or None

    duty_status = str(
        data.get(
            "duty_status",
            "off_duty"
        )
    ).strip()

    # --------------------------------------------------------
    # REQUIRED FIELDS
    # --------------------------------------------------------

    if (
        not name
        or not email
        or not password
        or not specialization
    ):
        return {
            "message": (
                "Name, email, password and "
                "specialization are required"
            ),
            "status":
                "error"
        }, 400

    # --------------------------------------------------------
    # EMAIL
    # --------------------------------------------------------

    if not is_valid_email(
        email
    ):
        return {
            "message": (
                "Please enter a valid "
                "email address"
            ),
            "status":
                "error"
        }, 400

    # --------------------------------------------------------
    # TEMPORARY PASSWORD
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
                "error"
        }, 400

    # --------------------------------------------------------
    # DUTY STATUS
    # --------------------------------------------------------

    if duty_status not in [
        "on_duty",
        "off_duty"
    ]:
        return {
            "message": (
                "duty_status must be "
                "on_duty or off_duty"
            ),
            "status":
                "error"
        }, 400

    # --------------------------------------------------------
    # DUPLICATE EMAIL
    # --------------------------------------------------------

    existing_user = (
        User.query
        .filter(
            db.func.lower(
                User.email
            ) == email
        )
        .first()
    )

    if existing_user:
        return {
            "message": (
                "A user with this email "
                "already exists"
            ),
            "status":
                "error"
        }, 409

    # --------------------------------------------------------
    # CREATE DOCTOR
    # --------------------------------------------------------

    try:

        doctor_user = User(
            name=
                name,
            email=
                email,
            password_hash=
                hash_password(
                    password
                ),
            role=
                "doctor",
            status=
                "active",

            # Admin creates the account
            # using doctor's real email.
            email_verified=
                True,

            # Admin password is temporary.
            must_change_password=
                True,

            verification_code_hash=
                None,

            verification_expires_at=
                None,

            verification_attempts=
                0
        )

        db.session.add(
            doctor_user
        )

        db.session.flush()

        doctor = Doctor(
            user_id=
                doctor_user.id,
            specialization=
                specialization,
            license_number=
                license_number,
            room_number=
                room_number,
            working_hours=
                working_hours,
            duty_status=
                duty_status
        )

        db.session.add(
            doctor
        )

        # ----------------------------------------------------
        # IMPORTANT:
        # Save account before sending notification email.
        # ----------------------------------------------------

        db.session.commit()

    except Exception:

        db.session.rollback()

        return {
            "message": (
                "Failed to create doctor"
            ),
            "status":
                "error"
        }, 500

    # --------------------------------------------------------
    # SEND ACCOUNT CREATED EMAIL
    #
    # Email failure must NOT delete/rollback
    # the successfully created doctor account.
    # --------------------------------------------------------

    email_sent = True

    try:

        send_staff_account_created_email(
            recipient_email=
                doctor_user.email,
            recipient_name=
                doctor_user.name,
            role=
                "doctor"
        )

    except Exception as email_error:

        email_sent = False

        print(
            "Doctor account email failed:",
            email_error
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": (
            "Doctor created successfully"
            if email_sent
            else (
                "Doctor created successfully, "
                "but the account notification "
                "email could not be sent."
            )
        ),
        "status":
            "success",
        "email_sent":
            email_sent,
        "doctor": {
            "doctor_id":
                doctor.id,
            "user_id":
                doctor_user.id,
            "name":
                doctor_user.name,
            "email":
                doctor_user.email,
            "status":
                doctor_user.status,
            "must_change_password":
                doctor_user.must_change_password,
            "specialization":
                doctor.specialization,
            "license_number":
                doctor.license_number,
            "room_number":
                doctor.room_number,
            "working_hours":
                doctor.working_hours,
            "duty_status":
                doctor.duty_status
        }
    }, 201


# ============================================================
# ADMIN - GET RECEPTIONISTS
# ============================================================

@admin_bp.route(
    "/receptionists",
    methods=["GET"]
)
@token_required
@role_required("admin")
def get_receptionists():
    """
    Get all receptionists
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: Receptionists retrieved successfully
      403:
        description: Admin access required
    """

    receptionists = (
        User.query
        .filter_by(
            role="receptionist"
        )
        .order_by(
            User.name.asc()
        )
        .all()
    )

    result = []

    for receptionist in receptionists:

        result.append({
            "id":
                receptionist.id,
            "name":
                receptionist.name,
            "email":
                receptionist.email,
            "role":
                receptionist.role,
            "status":
                receptionist.status,
            "email_verified":
                receptionist.email_verified,
            "must_change_password":
                receptionist.must_change_password,
            "created_at": (
                receptionist
                .created_at
                .isoformat()
                if receptionist.created_at
                else None
            )
        })

    return {
        "message": (
            "Receptionists retrieved successfully"
        ),
        "status":
            "success",
        "count":
            len(result),
        "receptionists":
            result
    }, 200


# ============================================================
# ADMIN - CREATE RECEPTIONIST
# ============================================================

@admin_bp.route(
    "/receptionists",
    methods=["POST"]
)
@token_required
@role_required("admin")
def create_receptionist():
    """
    Create a new receptionist account
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: receptionist
        required: true
        schema:
          type: object
          required:
            - name
            - email
            - password
          properties:
            name:
              type: string
              example: Receptionist Sara
            email:
              type: string
              format: email
              example: receptionist@gmail.com
            password:
              type: string
              format: password
              example: ReceptionistTemp@123
    responses:
      201:
        description: Receptionist created successfully
      400:
        description: Invalid request
      403:
        description: Admin access required
      409:
        description: Email already exists
    """

    data = request.get_json(
        silent=True
    )

    if not data:
        return {
            "message": (
                "Request body is required"
            ),
            "status":
                "error"
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

    password = str(
        data.get(
            "password",
            ""
        )
    )

    # --------------------------------------------------------
    # REQUIRED FIELDS
    # --------------------------------------------------------

    if (
        not name
        or not email
        or not password
    ):
        return {
            "message": (
                "Name, email and password "
                "are required"
            ),
            "status":
                "error"
        }, 400

    # --------------------------------------------------------
    # EMAIL
    # --------------------------------------------------------

    if not is_valid_email(
        email
    ):
        return {
            "message": (
                "Please enter a valid "
                "email address"
            ),
            "status":
                "error"
        }, 400

    # --------------------------------------------------------
    # TEMPORARY PASSWORD
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
                "error"
        }, 400

    # --------------------------------------------------------
    # DUPLICATE EMAIL
    # --------------------------------------------------------

    existing_user = (
        User.query
        .filter(
            db.func.lower(
                User.email
            ) == email
        )
        .first()
    )

    if existing_user:
        return {
            "message": (
                "A user with this email "
                "already exists"
            ),
            "status":
                "error"
        }, 409

    # --------------------------------------------------------
    # CREATE RECEPTIONIST
    # --------------------------------------------------------

    try:

        receptionist = User(
            name=
                name,
            email=
                email,
            password_hash=
                hash_password(
                    password
                ),
            role=
                "receptionist",
            status=
                "active",

            # Account is created by Admin
            # using receptionist's real email.
            email_verified=
                True,

            # Admin password is temporary.
            must_change_password=
                True,

            verification_code_hash=
                None,

            verification_expires_at=
                None,

            verification_attempts=
                0
        )

        db.session.add(
            receptionist
        )

        # ----------------------------------------------------
        # Save account first.
        # ----------------------------------------------------

        db.session.commit()

    except Exception:

        db.session.rollback()

        return {
            "message": (
                "Failed to create receptionist"
            ),
            "status":
                "error"
        }, 500

    # --------------------------------------------------------
    # SEND ACCOUNT CREATED EMAIL
    # --------------------------------------------------------

    email_sent = True

    try:

        send_staff_account_created_email(
            recipient_email=
                receptionist.email,
            recipient_name=
                receptionist.name,
            role=
                "receptionist"
        )

    except Exception as email_error:

        email_sent = False

        print(
            "Receptionist account email failed:",
            email_error
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": (
            "Receptionist created successfully"
            if email_sent
            else (
                "Receptionist created successfully, "
                "but the account notification "
                "email could not be sent."
            )
        ),
        "status":
            "success",
        "email_sent":
            email_sent,
        "receptionist": {
            "id":
                receptionist.id,
            "name":
                receptionist.name,
            "email":
                receptionist.email,
            "role":
                receptionist.role,
            "status":
                receptionist.status,
            "must_change_password":
                receptionist.must_change_password
        }
    }, 201


# ============================================================
# ADMIN - ACTIVATE / DEACTIVATE STAFF
# ============================================================

@admin_bp.route(
    "/staff/<int:user_id>/status",
    methods=["PATCH"]
)
@token_required
@role_required("admin")
def update_staff_status(user_id):
    """
    Activate or deactivate a doctor/receptionist account
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: path
        name: user_id
        required: true
        type: integer
        example: 4

      - in: body
        name: status
        required: true
        schema:
          type: object
          required:
            - status
          properties:
            status:
              type: string
              enum:
                - active
                - inactive
              example: inactive

    responses:
      200:
        description: Staff account status updated successfully

      400:
        description: Invalid status or unsupported account role

      403:
        description: Admin access required

      404:
        description: Staff account not found

      500:
        description: Failed to update staff account
    """

    # --------------------------------------------------------
    # REQUEST BODY
    # --------------------------------------------------------

    data = request.get_json(
        silent=True
    )

    if not data:
        return {
            "message":
                "Request body is required",
            "status":
                "error"
        }, 400


    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    new_status = str(
        data.get(
            "status",
            ""
        )
    ).strip().lower()


    if new_status not in [
        "active",
        "inactive"
    ]:
        return {
            "message": (
                "status must be active "
                "or inactive"
            ),
            "status":
                "error"
        }, 400


    # --------------------------------------------------------
    # USER
    # --------------------------------------------------------

    user = db.session.get(
        User,
        user_id
    )


    if not user:
        return {
            "message":
                "Staff account not found",
            "status":
                "error"
        }, 404


    # --------------------------------------------------------
    # ONLY STAFF ACCOUNTS
    #
    # Admin accounts and patient accounts must not be changed
    # through this route.
    # --------------------------------------------------------

    if user.role not in [
        "doctor",
        "receptionist"
    ]:
        return {
            "message": (
                "Only doctor and receptionist "
                "accounts can be managed "
                "through this endpoint"
            ),
            "status":
                "error"
        }, 400


    previous_status = (
        user.status
    )


    # --------------------------------------------------------
    # UPDATE
    # --------------------------------------------------------

    try:

        user.status = (
            new_status
        )


        doctor = None


        # ----------------------------------------------------
        # DOCTOR-SPECIFIC SAFETY
        #
        # An inactive doctor must never remain marked on-duty.
        #
        # When the doctor is reactivated we intentionally keep
        # duty_status as off_duty. The doctor can explicitly
        # mark themselves on duty again after login.
        # ----------------------------------------------------

        if user.role == "doctor":

            doctor = (
                Doctor.query
                .filter_by(
                    user_id=user.id
                )
                .first()
            )


            if not doctor:

                db.session.rollback()

                return {
                    "message": (
                        "Doctor profile "
                        "not found"
                    ),
                    "status":
                        "error"
                }, 404


            if (
                new_status
                == "inactive"
            ):
                doctor.duty_status = (
                    "off_duty"
                )


        db.session.commit()


    except Exception:

        db.session.rollback()

        return {
            "message": (
                "Failed to update "
                "staff account status"
            ),
            "status":
                "error"
        }, 500


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    response = {
        "message": (
            f"{user.role.capitalize()} "
            f"account "
            f"{'activated' if new_status == 'active' else 'deactivated'} "
            f"successfully"
        ),
        "status":
            "success",
        "staff": {
            "user_id":
                user.id,
            "name":
                user.name,
            "email":
                user.email,
            "role":
                user.role,
            "previous_status":
                previous_status,
            "status":
                user.status
        }
    }


    if doctor:

        response["staff"]["doctor_id"] = (
            doctor.id
        )

        response["staff"]["duty_status"] = (
            doctor.duty_status
        )


    return response, 200