from app import db


class ClinicStaffMembership(db.Model):
    __tablename__ = "clinic_staff_memberships"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    clinic_id = db.Column(
        db.Integer,
        db.ForeignKey("clinics.id"),
        nullable=False,
        index=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    staff_role = db.Column(
        db.Enum(
            "clinic_admin",
            "receptionist"
        ),
        nullable=False
    )

    status = db.Column(
        db.Enum(
            "active",
            "inactive"
        ),
        nullable=False,
        default="active"
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )

    __table_args__ = (
        db.UniqueConstraint(
            "clinic_id",
            "user_id",
            name="uq_clinic_staff_membership"
        ),
    )

    clinic = db.relationship(
        "Clinic",
        backref="staff_memberships"
    )

    user = db.relationship(
        "User",
        backref="clinic_staff_memberships"
    )

    def __repr__(self):
        return (
            f"<ClinicStaffMembership "
            f"clinic={self.clinic_id} "
            f"user={self.user_id} "
            f"role={self.staff_role}>"
        )
