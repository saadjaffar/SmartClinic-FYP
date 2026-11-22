import smtplib
from email.message import EmailMessage

from flask import current_app


# ============================================================
# INTERNAL EMAIL SENDER
# ============================================================

def _send_email(
    recipient_email,
    subject,
    body
):
    smtp_host = current_app.config.get(
        "SMTP_HOST"
    )

    smtp_port = current_app.config.get(
        "SMTP_PORT"
    )

    smtp_user = current_app.config.get(
        "SMTP_USER"
    )

    smtp_password = current_app.config.get(
        "SMTP_PASSWORD"
    )

    mail_from = current_app.config.get(
        "MAIL_FROM"
    )


    if not all([
        smtp_host,
        smtp_port,
        smtp_user,
        smtp_password,
        mail_from
    ]):
        raise RuntimeError(
            "Email service is not configured"
        )


    message = EmailMessage()

    message["Subject"] = subject
    message["From"] = mail_from
    message["To"] = recipient_email

    message.set_content(
        body
    )


    with smtplib.SMTP(
        smtp_host,
        smtp_port,
        timeout=20
    ) as server:

        server.starttls()

        server.login(
            smtp_user,
            smtp_password
        )

        server.send_message(
            message
        )


# ============================================================
# REGISTRATION EMAIL VERIFICATION
# ============================================================

def send_verification_email(
    recipient_email,
    recipient_name,
    verification_code
):
    subject = (
        "SmartClinic Email Verification"
    )

    body = f"""
Hello {recipient_name},

Your SmartClinic verification code is:

{verification_code}

This code will expire in 10 minutes.

If you did not create this SmartClinic account,
you can ignore this email.

SmartClinic
Clinic Management System
    """.strip()


    _send_email(
        recipient_email,
        subject,
        body
    )


# ============================================================
# PASSWORD RESET OTP
# ============================================================

def send_password_reset_email(
    recipient_email,
    recipient_name,
    reset_code
):
    subject = (
        "SmartClinic Password Reset Code"
    )

    body = f"""
Hello {recipient_name},

We received a request to reset the password
for your SmartClinic account.

Your password reset code is:

{reset_code}

This code will expire in 10 minutes.

Do not share this code with anyone.

If you did not request a password reset,
you can safely ignore this email.

SmartClinic
Clinic Management System
    """.strip()


    _send_email(
        recipient_email,
        subject,
        body
    )


# ============================================================
# PATIENT WELCOME EMAIL
# ============================================================

def send_welcome_email(
    recipient_email,
    recipient_name
):
    subject = (
        "Welcome to SmartClinic"
    )

    body = f"""
Hello {recipient_name},

Welcome to SmartClinic!

Your email has been verified successfully
and your patient account is now active.

Thank you for joining SmartClinic.

SmartClinic
Clinic Management System
    """.strip()


    _send_email(
        recipient_email,
        subject,
        body
    )


# ============================================================
# STAFF ACCOUNT CREATED EMAIL
# ============================================================

def send_staff_account_created_email(
    recipient_email,
    recipient_name,
    role
):
    role_display = (
        str(role)
        .strip()
        .replace(
            "_",
            " "
        )
        .title()
    )


    subject = (
        f"Your SmartClinic {role_display} "
        f"Account Has Been Created"
    )


    body = f"""
Hello {recipient_name},

Your SmartClinic {role_display} account
has been created successfully.

Account Details:

Role: {role_display}
Email: {recipient_email}

Your administrator has provided you with
a temporary SmartClinic password.

Please use your registered email and
temporary password to login to SmartClinic.

For security, you will be required to
create your own new password on your
first login before accessing your dashboard.

Important:

Your SmartClinic password is separate
from your Gmail or email account password.

SmartClinic will never ask for or store
your Gmail password.

If you were not expecting this account,
please contact the SmartClinic administrator.

SmartClinic
Clinic Management System
    """.strip()


    _send_email(
        recipient_email,
        subject,
        body
    )


def send_clinic_admin_account_email(
    recipient_email,
    recipient_name,
    clinic_name,
    temporary_password
):
    subject = "Your SmartClinic Clinic Admin Account"
    body = f"""
Hello {recipient_name},

A Clinic Admin account has been created for you.

Clinic: {clinic_name}
Email: {recipient_email}
Temporary password: {temporary_password}

Sign in to SmartClinic and change this temporary
password before accessing clinic administration.

If you were not expecting this account, contact
the SmartClinic platform administrator.

SmartClinic
Clinic Management System
    """.strip()

    _send_email(
        recipient_email,
        subject,
        body
    )


def send_doctor_clinic_invitation_email(
    recipient_email,
    recipient_name,
    clinic_name,
    approval_url,
    temporary_password=None
):
    credentials = ""
    if temporary_password:
        credentials = f"""
Email: {recipient_email}
Temporary password: {temporary_password}

After approving the clinic invitation, sign in and
change the temporary password on your first login.
"""
    else:
        credentials = f"""
Use your existing SmartClinic account to sign in.
Your current password will not be changed.
"""

    subject = f"SmartClinic doctor invitation: {clinic_name}"
    body = f"""
Hello {recipient_name},

{clinic_name} has invited you to join its SmartClinic
doctor team. Review and approve the invitation here:

{approval_url}

This one-time approval link expires in 7 days.

{credentials}
If you were not expecting this invitation, you can
ignore this email.

SmartClinic
Clinic Management System
    """.strip()

    _send_email(
        recipient_email,
        subject,
        body
    )