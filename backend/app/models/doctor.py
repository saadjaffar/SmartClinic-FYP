from app import db


class Doctor(db.Model):
    __tablename__ = "doctors"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    specialization = db.Column(
        db.String(100),
        nullable=False
    )

    license_number = db.Column(
        db.String(100),
        nullable=True
    )

    room_number = db.Column(
        db.String(50),
        nullable=True
    )

    working_hours = db.Column(
        db.String(100),
        nullable=True
    )

    duty_status = db.Column(
        db.Enum("on_duty", "off_duty"),
        default="off_duty"
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )

    user = db.relationship(
        "User",
        backref=db.backref("doctor_profile", uselist=False)
    )

    def __repr__(self):
        return f"<Doctor {self.id}>"