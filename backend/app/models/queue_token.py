from app import db


class QueueToken(db.Model):
    __tablename__ = "queue_tokens"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointments.id"),
        nullable=False
    )

    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("doctors.id"),
        nullable=False
    )

    patient_id = db.Column(
        db.Integer,
        db.ForeignKey("patients.id"),
        nullable=False
    )

    token_number = db.Column(
        db.Integer,
        nullable=False
    )

    priority = db.Column(
        db.Enum("normal", "urgent"),
        nullable=False,
        default="normal"
    )

    status = db.Column(
        db.Enum(
            "waiting",
            "called",
            "in_consultation",
            "completed",
            "skipped",
            "no_show"
        ),
        nullable=False,
        default="waiting"
    )

    check_in_time = db.Column(
        db.DateTime,
        nullable=True
    )

    called_at = db.Column(
        db.DateTime,
        nullable=True
    )

    consultation_started_at = db.Column(
        db.DateTime,
        nullable=True
    )

    completed_at = db.Column(
        db.DateTime,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )