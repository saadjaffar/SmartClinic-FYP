import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://"
        f"{os.getenv('DB_USER')}:"
        f"{os.getenv('DB_PASSWORD')}@"
        f"{os.getenv('DB_HOST')}:"
        f"{os.getenv('DB_PORT')}/"
        f"{os.getenv('DB_NAME')}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SMTP_HOST = os.getenv("SMTP_HOST")

    SMTP_PORT = int(
        os.getenv(
            "SMTP_PORT",
            "587"
        )
    )

    SMTP_USER = os.getenv("SMTP_USER")

    SMTP_PASSWORD = os.getenv(
        "SMTP_PASSWORD"
    )

    MAIL_FROM = os.getenv("MAIL_FROM")