import click

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flasgger import Swagger
from dotenv import load_dotenv
import os

from app.config import Config


load_dotenv(
    os.path.join(
        os.path.dirname(
            os.path.dirname(__file__)
        ),
        ".env"
    )
)

db = SQLAlchemy()


def create_app():
    app = Flask(__name__)

    app.config.from_object(Config)

    db.init_app(app)

    CORS(app)

    # Swagger configuration continues below...

    # Swagger configuration
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": "swagger",
                "route": "/swagger.json",
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/docs/"
    }

    swagger_template = {
    "info": {
        "title": "SmartClinic API",
        "description": "SmartClinic Clinic Management System API",
        "version": "1.0.0"
    },
    "basePath": "/",
    "schemes": ["http"],

    "securityDefinitions": {
    "Bearer": {
        "type": "apiKey",
        "name": "Authorization",
        "in": "header",
        "description": "Enter JWT token only. Bearer prefix is optional."
    }
}
}

    Swagger(
        app,
        config=swagger_config,
        template=swagger_template
    )

    # Import models
    from app.models import User, Patient, Doctor

    # Register authentication routes
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    from app.routes.admin import admin_bp
    app.register_blueprint(admin_bp)

    from app.routes.patient import patient_bp
    app.register_blueprint(patient_bp)

    from app.routes.doctor import doctor_bp
    app.register_blueprint(doctor_bp)

    from app.routes.appointments import appointment_bp
    app.register_blueprint(appointment_bp)

    from app.routes.queue import queue_bp
    app.register_blueprint(queue_bp)

    from app.routes.consultation import consultation_bp
    app.register_blueprint(consultation_bp)

    from app.routes.receptionist import receptionist_bp
    app.register_blueprint(receptionist_bp)

    from app.routes.clinics import clinic_bp
    app.register_blueprint(clinic_bp)

    @app.cli.command("create-super-admin")
    def create_super_admin():
        """Create a Super Admin account with credentials entered locally."""
        from app.utils.auth import hash_password

        name = click.prompt("Super Admin name").strip()
        email = click.prompt("Super Admin email").strip().lower()
        password = click.prompt(
            "Password",
            hide_input=True,
            confirmation_prompt=True,
        )

        if not name:
            raise click.ClickException("Name is required.")

        email_parts = email.rsplit("@", 1)
        if (
            len(email_parts) != 2
            or not email_parts[0]
            or "." not in email_parts[1]
            or email_parts[1].startswith(".")
            or email_parts[1].endswith(".")
        ):
            raise click.ClickException("Enter a valid email address.")

        if len(password) < 8:
            raise click.ClickException(
                "Password must be at least 8 characters long."
            )

        existing_user = User.query.filter(
            db.func.lower(User.email) == email
        ).first()
        if existing_user:
            raise click.ClickException(
                "A SmartClinic account already uses this email."
            )

        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            status="active",
            email_verified=True,
            must_change_password=False,
        )
        db.session.add(user)
        db.session.commit()
        click.echo("Super Admin account created successfully.")

    @app.cli.command("make-clinic-admin")
    def make_clinic_admin():
        """Transfer an existing clinic-linked account from Super Admin."""
        from app.models import ClinicStaffMembership

        email = click.prompt("Clinic Admin email").strip().lower()
        user = User.query.filter(
            db.func.lower(User.email) == email
        ).first()

        if not user:
            raise click.ClickException("No account uses this email.")

        if user.role != "admin":
            raise click.ClickException(
                "Only a current Super Admin account can be transferred."
            )

        membership = ClinicStaffMembership.query.filter_by(
            user_id=user.id,
            staff_role="clinic_admin",
            status="active",
        ).first()
        if not membership:
            raise click.ClickException(
                "This account has no active Clinic Admin membership."
            )

        active_super_admins = User.query.filter_by(
            role="admin",
            status="active",
        ).count()
        if active_super_admins < 2:
            raise click.ClickException(
                "Create and verify another active Super Admin first."
            )

        user.role = "clinic_admin"
        db.session.commit()
        click.echo(
            "Account transferred to Clinic Admin successfully."
        )

    @app.route("/")
    def home():
        return {
            "message": "SmartClinic Backend is running",
            "status": "success"
        }

    @app.route("/api/health")
    def health():
        return {
            "message": "SmartClinic API is healthy",
            "status": "success"
        }

    return app