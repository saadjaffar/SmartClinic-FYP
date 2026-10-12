from app import db


class Consultation(db.Model):
    __tablename__ = "consultations"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointments.id"),
        nullable=False,
        index=True
    )

    patient_id = db.Column(
        db.Integer,
        db.ForeignKey("patients.id"),
        nullable=False,
        index=True
    )

    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("doctors.id"),
        nullable=False,
        index=True
    )

    chief_complaint = db.Column(
        db.Text,
        nullable=True
    )

    diagnosis = db.Column(
        db.Text,
        nullable=True
    )

    prescription = db.Column(
        db.Text,
        nullable=True
    )

    doctor_notes = db.Column(
        db.Text,
        nullable=True
    )

    started_at = db.Column(
        db.DateTime,
        nullable=True
    )

    ended_at = db.Column(
        db.DateTime,
        nullable=True
    )

    duration_minutes = db.Column(
        db.Numeric(6, 2),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )

    appointment = db.relationship(
        "Appointment",
        backref=db.backref("consultation", uselist=False)
    )

    patient = db.relationship(
        "Patient",
        backref="consultations"
    )

    doctor = db.relationship(
        "Doctor",
        backref="consultations"
    )

    def __repr__(self):
        return f"<Consultation {self.id}>"