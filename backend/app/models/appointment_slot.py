from app import db


class AppointmentSlot(db.Model):
    __tablename__ = "appointment_slots"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("doctors.id"),
        nullable=False
    )

    slot_date = db.Column(
        db.Date,
        nullable=False
    )

    start_time = db.Column(
        db.Time,
        nullable=False
    )

    end_time = db.Column(
        db.Time,
        nullable=False
    )

    status = db.Column(
        db.Enum("available", "booked", "blocked"),
        nullable=False,
        default="available"
    )

    version = db.Column(
        db.Integer,
        nullable=False,
        default=1
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )