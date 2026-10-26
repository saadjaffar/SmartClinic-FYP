from app import db


class Clinic(db.Model):
    __tablename__ = "clinics"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    address = db.Column(
        db.String(255),
        nullable=True
    )

    contact = db.Column(
        db.String(30),
        nullable=True
    )

    email = db.Column(
        db.String(150),
        nullable=True
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

    def __repr__(self):
        return f"<Clinic {self.id} {self.name}>"
