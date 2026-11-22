from app import db


class DoctorClinicMembership(db.Model):
    __tablename__ = "doctor_clinic_memberships"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("doctors.id"),
        nullable=False,
        index=True
    )

    clinic_id = db.Column(
        db.Integer,
        db.ForeignKey("clinics.id"),
        nullable=False,
        index=True
    )

    status = db.Column(
        db.Enum(
            "pending",
            "active",
            "rejected",
            "inactive"
        ),
        nullable=False,
        default="pending"
    )

    duty_status = db.Column(
        db.Enum(
            "on_duty",
            "off_duty"
        ),
        nullable=False,
        default="off_duty"
    )

    room_number = db.Column(
        db.String(50),
        nullable=True
    )

    invitation_token_hash = db.Column(
        db.String(255),
        nullable=True
    )

    invitation_expires_at = db.Column(
        db.DateTime,
        nullable=True
    )

    approved_at = db.Column(
        db.DateTime,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )

    __table_args__ = (
        db.UniqueConstraint(
            "doctor_id",
            "clinic_id",
            name="uq_doctor_clinic_membership"
        ),
    )

    doctor = db.relationship(
        "Doctor",
        backref="clinic_memberships"
    )

    clinic = db.relationship(
        "Clinic",
        backref="doctor_memberships"
    )
