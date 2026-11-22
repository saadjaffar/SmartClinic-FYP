# SmartClinic FYP

Smart Clinic Appointment and Queue Management System

## Overview

SmartClinic is a mobile-based clinic management system designed to improve appointment booking, patient queue management, staff workflows, and doctor-patient interaction.

The system provides separate role-based access for:

- Super Admin
- Clinic Admin
- Doctor
- Receptionist
- Patient

The project is developed as a Final Year Project using React Native / Expo, Flask, and MySQL.

## Current Features

### Patient

- Account registration
- Email OTP verification
- Secure login
- Forgot password through email OTP
- View doctors
- See which clinic a doctor belongs to
- Book appointments
- Select in-person or video appointment type
- View appointments
- Cancel eligible appointments
- View queue status
- View medical consultation history
- Manage patient profile

### Doctor

- Secure staff login
- Mandatory password change on first login
- Forgot password through registered email
- Doctor dashboard
- Manage weekly schedule
- Switch between approved clinic memberships on the dashboard and schedule page
- Keep room, duty status, schedule, slots, and queue specific to each clinic
- Generate appointment slots
- View checked-in patient queue
- Call next patient
- Start consultation
- Record diagnosis
- Record prescription
- Add doctor notes
- Complete consultation

### Receptionist

- Secure staff login
- Mandatory password change on first login
- Forgot password through registered email
- Receptionist dashboard
- View today's appointments
- Patient check-in
- View live clinic queue
- Register regular front-desk walk-ins
- Escalate waiting patients to urgent or critical priority

### Super Admin and Clinic Admin

- Super Admin dashboard
- View system statistics
- Manually create clinics and their first Clinic Admin
- Clinic Admin invites doctors, adds receptionists, and manages clinic-scoped staff access
- Doctors approve new clinic associations from an email link
- Receptionists have one active clinic assignment at a time
- Deactivating a doctor at one clinic does not change their other clinic memberships
- Doctor clinic access cannot be deactivated while that clinic has upcoming or active appointments

To create an additional Super Admin before changing an existing account's
role, run this backend command from the `backend` directory:

```powershell
.\venv\Scripts\flask.exe --app run.py create-super-admin
```

The command asks for the account details locally and hides password input.
Do not put the password in the command or source code. Verify that the new
account can sign in before changing the existing Super Admin's role.

After the multi-clinic database upgrade, an existing Super Admin with an
active Clinic Admin membership can be transferred with:

```powershell
.\venv\Scripts\flask.exe --app run.py make-clinic-admin
```

This command requires at least two active Super Admin accounts before it
changes a role, so the system does not lose its Super Admin access.

## Queue Management

The current implementation supports:

- FIFO queue processing
- Critical, urgent, and normal priority ordering
- Patient check-in before entering the live queue
- Clinic-specific queue handling
- Queue token generation
- Consultation lifecycle management
- Regular and emergency front-desk walk-ins

## Appointment Conflict Protection

Appointment booking uses database row locking to reduce race conditions and prevent two patients from booking the same appointment slot simultaneously.
Doctor schedules and scheduled appointments also check for time conflicts across clinic memberships.

## Multi-Clinic Database Upgrade

The multi-clinic code requires the one-time schema upgrade in
`backend/sql/multi_clinic_upgrade.sql`. The migration maps existing clinic
records to a single initial clinic, removes the old one-schedule-per-doctor-
per-day constraint so non-overlapping clinic shifts can coexist, and is
**not safe to run more than once**.
Back up the `smartclinic` database first, review the SQL, and do not run it
against a database until the application changes have been reviewed and the
current data has been confirmed. The migration has already been applied to
the current development database; do not run it there again.

Doctor invitation links use `APP_BASE_URL`; configure it to an address the
doctor can open before testing email approval. Do not share passwords or
other private environment settings when asking for setup help.

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Role-based authorization
- Email OTP verification
- Password reset OTP
- Temporary staff passwords
- Mandatory password change for newly created staff
- Backend enforcement of first-login password change
- Inactive account protection
- Environment variables for private credentials

## Technology Stack

### Frontend

- React Native
- Expo
- Expo Router
- TypeScript

### Backend

- Python
- Flask
- Flask-SQLAlchemy
- JWT
- bcrypt

### Database

- MySQL / MariaDB
- XAMPP

## Project Structure

```text
SmartClinic-FYP
├── backend
│   ├── app
│   │   ├── models
│   │   ├── routes
│   │   └── utils
│   ├── requirements.txt
│   └── run.py
│
├── frontend
│   ├── src
│   │   ├── api
│   │   ├── app
│   │   ├── screens
│   │   └── storage
│   ├── package.json
│   └── app.json
│
└── README.md

Planned Features
The following features are planned as the project progresses:
- Admin staff account activation and deactivation
- Improved doctor availability engine
- Doctor leave and absence handling
- No-show handling
- Video consultation
- Patient notifications
- AI-based doctor recommendation
- NLP symptom processing
- ML-based waiting-time prediction
- AI chatbot

Running the Backend
cd backend
.\venv\Scripts\Activate.ps1
python run.py
Backend API:
http://127.0.0.1:5000
Swagger documentation:
http://127.0.0.1:5000/docs/

Running the Frontend
cd frontend
npm install
npx expo start
The Expo development server can then be opened using Expo Go or the web development environment.

Project Status
SmartClinic is currently under active Final Year Project development.
Core authentication, role management, appointment booking, queue management,
patient check-in, consultation management, and staff workflows have been
implemented. The multi-clinic schema migration has been applied to the current
development database and the existing records have been mapped to the initial
clinic. End-to-end verification is still pending; do not treat multi-clinic
features as complete until that testing has been done. Additional intelligent
and telemedicine modules are being developed incrementally.

Authors
- Saad Jaffar - Reg No. (FA23-BSE-056)
- Muhammad Faareh Ishaq - Reg No. (FA23-BSE-021)
Bachelor of Science in Software Engineering
COMSATS University Islamabad, Attock Campus
