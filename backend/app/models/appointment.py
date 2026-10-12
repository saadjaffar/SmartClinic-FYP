from app import db


class Appointment(db.Model):
    __tablename__ = "appointments"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    patient_id = db.Column(
        db.Integer,
        db.ForeignKey("patients.id"),
        nullable=False
    )

    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("doctors.id"),
        nullable=False
    )

    slot_id = db.Column(
        db.Integer,
        db.ForeignKey("appointment_slots.id"),
        nullable=False
    )

    appointment_date = db.Column(
        db.Date,
        nullable=False
    )

    appointment_type = db.Column(
        db.Enum("in_person", "video"),
        nullable=False
    )

    status = db.Column(
        db.Enum(
            "pending",
            "confirmed",
            "in_progress",
            "completed",
            "no_show",
            "cancelled"
        ),
        nullable=False,
        default="confirmed"
    )

    notes = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp()
    )