from app import db


class Patient(db.Model):
    __tablename__ = "patients"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    contact = db.Column(
        db.String(30),
        nullable=True
    )

    age = db.Column(
        db.Integer,
        nullable=True
    )

    gender = db.Column(
        db.Enum("Male", "Female", "Other"),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )

    user = db.relationship(
        "User",
        backref=db.backref("patient_profile", uselist=False)
    )

    def __repr__(self):
        return f"<Patient {self.id}>"