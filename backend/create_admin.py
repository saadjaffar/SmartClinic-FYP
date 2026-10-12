import getpass

from app import create_app, db
from app.models.user import User
from app.utils.auth import hash_password


app = create_app()


with app.app_context():

    print()
    print("===================================")
    print(" SmartClinic Admin Account Setup")
    print("===================================")
    print()

    admin_name = input(
        "Admin name: "
    ).strip()

    admin_email = input(
        "Admin email: "
    ).strip().lower()

    admin_password = getpass.getpass(
        "Admin password: "
    )

    confirm_password = getpass.getpass(
        "Confirm password: "
    )


    # ========================================================
    # VALIDATION
    # ========================================================

    if not admin_name:
        raise SystemExit(
            "Admin name is required."
        )


    if not admin_email:
        raise SystemExit(
            "Admin email is required."
        )


    if len(admin_password) < 8:
        raise SystemExit(
            "Admin password must be at least "
            "8 characters long."
        )


    if admin_password != confirm_password:
        raise SystemExit(
            "Passwords do not match."
        )


    # ========================================================
    # CHECK EXISTING ACCOUNT
    # ========================================================

    existing_user = (
        User.query
        .filter_by(
            email=admin_email
        )
        .first()
    )


    if existing_user:

        print()
        print(
            "A SmartClinic account with this "
            "email already exists."
        )

        raise SystemExit()


    # ========================================================
    # CREATE ADMIN
    # ========================================================

    admin = User(
        name=admin_name,
        email=admin_email,
        password_hash=hash_password(
            admin_password
        ),
        role="admin",
        status="active",
        email_verified=True,
        must_change_password=False,
    )


    try:

        db.session.add(
            admin
        )

        db.session.commit()


        print()
        print(
            "Admin created successfully."
        )

        print(
            "Email:",
            admin.email
        )


    except Exception:

        db.session.rollback()

        print()
        print(
            "Failed to create admin."
        )

        raise