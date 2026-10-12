# SmartClinic FYP

Smart Clinic Appointment and Queue Management System

## Overview

SmartClinic is a mobile-based clinic management system designed to improve appointment booking, patient queue management, staff workflows, and doctor-patient interaction.

The system provides separate role-based access for:

- Admin
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

### Admin

- Admin dashboard
- View system statistics
- Create doctor accounts
- Create receptionist accounts
- Staff account email notifications
- Monitor doctor duty status

## Queue Management

SmartClinic currently supports:

- FIFO queue processing
- Normal and urgent priority support at database level
- Patient check-in before entering the live queue
- Doctor-specific queue handling
- Queue token generation
- Consultation lifecycle management

The complete emergency walk-in workflow is under development.

## Appointment Conflict Protection

Appointment booking uses database row locking to reduce race conditions and prevent two patients from booking the same appointment slot simultaneously.

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
- Emergency / urgent walk-in patient workflow
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
Core authentication, role management, appointment booking, queue management, patient check-in, consultation management, and staff workflows have been implemented.
Additional intelligent and telemedicine modules are being developed incrementally.

Authors
- Saad Jaffar - Reg No. (FA23-BSE-056)
- Muhammad Faareh Ishaq - Reg No. (FA23-BSE-021)
Bachelor of Science in Software Engineering
COMSATS University Islamabad, Attock Campus
