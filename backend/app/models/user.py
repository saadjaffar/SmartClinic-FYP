from app import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    name = db.Column(
        db.String(100),
        nullable=False
    )

    email = db.Column(
        db.String(150),
        unique=True,
        nullable=False
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )


    # ========================================================
    # ROLE
    # ========================================================

    role = db.Column(
        db.Enum(
            "patient",
            "doctor",
            "receptionist",
            "admin"
        ),
        nullable=False
    )


    # ========================================================
    # ACCOUNT STATUS
    # ========================================================

    status = db.Column(
        db.Enum(
            "active",
            "inactive"
        ),
        nullable=False,
        default="active"
    )


    # ========================================================
    # FIRST LOGIN PASSWORD CHANGE
    # ========================================================

    must_change_password = db.Column(
        db.Boolean,
        nullable=False,
        default=False
    )


    # ========================================================
    # EMAIL VERIFICATION
    # ========================================================

    email_verified = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    verification_code_hash = db.Column(
        db.String(255),
        nullable=True
    )

    verification_expires_at = db.Column(
        db.DateTime,
        nullable=True
    )

    verification_attempts = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )


    # ========================================================
    # PASSWORD RESET OTP
    # ========================================================

    password_reset_code_hash = db.Column(
        db.String(255),
        nullable=True
    )

    password_reset_expires_at = db.Column(
        db.DateTime,
        nullable=True
    )

    password_reset_attempts = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )


    # ========================================================
    # PASSWORD RESET TOKEN
    # ========================================================

    password_reset_token_hash = db.Column(
        db.String(255),
        nullable=True
    )

    password_reset_token_expires_at = db.Column(
        db.DateTime,
        nullable=True
    )


    # ========================================================
    # CREATED AT
    # ========================================================

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )


    def __repr__(self):
        return (
            f"<User {self.email}>"
        )