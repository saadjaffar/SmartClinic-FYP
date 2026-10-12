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