from app import db


class Patient(db.Model):
    __tablename__ = "patients"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    # --------------------------------------------------------
    # LINKED USER ACCOUNT
    #
    # Registered portal patients have a user_id.
    # Front-desk / emergency walk-in patients may have NULL.
    # --------------------------------------------------------

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    # --------------------------------------------------------
    # STANDALONE PATIENT NAME
    #
    # Registered patients normally use User.name.
    # Front-desk patients store their name here.
    # --------------------------------------------------------

    name = db.Column(
        db.String(100),
        nullable=True
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
        db.Enum(
            "Male",
            "Female",
            "Other"
        ),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )

    user = db.relationship(
        "User",
        backref=db.backref(
            "patient_profile",
            uselist=False
        )
    )

    @property
    def display_name(self):
        """
        Registered patient:
            use linked User.name.

        Standalone/front-desk patient:
            use Patient.name.
        """

        if self.user:
            return self.user.name

        return self.name

    @property
    def is_registered_user(self):
        return self.user_id is not None

    def __repr__(self):
        return (
            f"<Patient "
            f"{self.id} "
            f"{self.display_name or 'Unnamed'}>"
        )