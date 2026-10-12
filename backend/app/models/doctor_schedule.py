from app import db


class DoctorSchedule(db.Model):
    __tablename__ = "doctor_schedules"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("doctors.id"),
        nullable=False
    )

    day_of_week = db.Column(
        db.Enum(
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
        ),
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

    slot_duration_minutes = db.Column(
        db.Integer,
        nullable=False
    )

    is_active = db.Column(
        db.Boolean,
        default=True
    )