-- ============================================================
-- SmartClinic
-- Multi-clinic schema upgrade
-- ============================================================
--
-- IMPORTANT:
-- 1. Back up the smartclinic database before running this file.
-- 2. This is a one-time migration for the existing single-clinic
--    database. Do not run it twice.
-- 3. If clinics already contains multiple rows, stop and map the
--    existing records to the correct clinic before continuing.
-- 4. Deploy the matching application code before using this schema.
--
-- Existing "admin" accounts remain Super Admins until an explicitly
-- transferred account is changed with the make-clinic-admin CLI command.
-- Existing doctors/receptionists and clinic data are assigned to
-- the first clinic created below.

USE smartclinic;

CREATE TABLE IF NOT EXISTS clinics (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NULL,
    contact VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

INSERT INTO clinics (
    name,
    status
)
SELECT
    'SmartClinic Main Clinic',
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM clinics
);

SET @default_clinic_id = (
    SELECT MIN(id)
    FROM clinics
);

CREATE TABLE IF NOT EXISTS clinic_staff_memberships (
    id INT NOT NULL AUTO_INCREMENT,
    clinic_id INT NOT NULL,
    user_id INT NOT NULL,
    staff_role ENUM('clinic_admin', 'receptionist') NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_clinic_staff_membership (clinic_id, user_id),
    KEY ix_clinic_staff_memberships_clinic_id (clinic_id),
    KEY ix_clinic_staff_memberships_user_id (user_id),
    CONSTRAINT fk_clinic_staff_memberships_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics (id),
    CONSTRAINT fk_clinic_staff_memberships_user
        FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS doctor_clinic_memberships (
    id INT NOT NULL AUTO_INCREMENT,
    doctor_id INT NOT NULL,
    clinic_id INT NOT NULL,
    status ENUM('pending', 'active', 'rejected', 'inactive')
        NOT NULL DEFAULT 'pending',
    duty_status ENUM('on_duty', 'off_duty')
        NOT NULL DEFAULT 'off_duty',
    room_number VARCHAR(50) NULL,
    invitation_token_hash VARCHAR(255) NULL,
    invitation_expires_at DATETIME NULL,
    approved_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_doctor_clinic_membership (doctor_id, clinic_id),
    KEY ix_doctor_clinic_memberships_doctor_id (doctor_id),
    KEY ix_doctor_clinic_memberships_clinic_id (clinic_id),
    CONSTRAINT fk_doctor_clinic_memberships_doctor
        FOREIGN KEY (doctor_id) REFERENCES doctors (id),
    CONSTRAINT fk_doctor_clinic_memberships_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics (id)
);

ALTER TABLE users
    MODIFY COLUMN role ENUM(
        'patient',
        'doctor',
        'receptionist',
        'admin',
        'clinic_admin'
    ) NOT NULL;

ALTER TABLE doctor_schedules
    ADD INDEX ix_doctor_schedules_doctor_id (doctor_id);

ALTER TABLE doctor_schedules
    DROP INDEX doctor_id,
    ADD COLUMN clinic_id INT NULL AFTER doctor_id;

ALTER TABLE appointment_slots
    ADD COLUMN clinic_id INT NULL AFTER doctor_id;

ALTER TABLE appointments
    ADD COLUMN clinic_id INT NULL AFTER doctor_id;

ALTER TABLE patients
    ADD COLUMN clinic_id INT NULL AFTER user_id;

UPDATE doctor_schedules
SET clinic_id = @default_clinic_id
WHERE clinic_id IS NULL;

UPDATE appointment_slots
SET clinic_id = @default_clinic_id
WHERE clinic_id IS NULL;

UPDATE appointments
SET clinic_id = COALESCE(
    (
        SELECT appointment_slots.clinic_id
        FROM appointment_slots
        WHERE appointment_slots.id = appointments.slot_id
    ),
    @default_clinic_id
)
WHERE clinic_id IS NULL;

UPDATE patients
SET clinic_id = @default_clinic_id
WHERE user_id IS NULL
  AND clinic_id IS NULL;

ALTER TABLE doctor_schedules
    MODIFY COLUMN clinic_id INT NOT NULL,
    ADD INDEX ix_doctor_schedules_clinic_id (clinic_id),
    ADD CONSTRAINT fk_doctor_schedules_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics (id);

ALTER TABLE appointment_slots
    MODIFY COLUMN clinic_id INT NOT NULL,
    ADD INDEX ix_appointment_slots_clinic_id (clinic_id),
    ADD CONSTRAINT fk_appointment_slots_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics (id);

ALTER TABLE appointments
    MODIFY COLUMN clinic_id INT NOT NULL,
    ADD INDEX ix_appointments_clinic_id (clinic_id),
    ADD CONSTRAINT fk_appointments_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics (id);

ALTER TABLE patients
    ADD INDEX ix_patients_clinic_id (clinic_id),
    ADD CONSTRAINT fk_patients_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics (id);

ALTER TABLE queue_tokens
    MODIFY COLUMN priority ENUM(
        'normal',
        'urgent',
        'critical'
    ) NOT NULL DEFAULT 'normal';

INSERT INTO doctor_clinic_memberships (
    doctor_id,
    clinic_id,
    status,
    duty_status,
    room_number,
    approved_at
)
SELECT
    doctors.id,
    @default_clinic_id,
    'active',
    doctors.duty_status,
    doctors.room_number,
    CURRENT_TIMESTAMP
FROM doctors;

INSERT INTO clinic_staff_memberships (
    clinic_id,
    user_id,
    staff_role,
    status
)
SELECT
    @default_clinic_id,
    users.id,
    'receptionist',
    users.status
FROM users
WHERE users.role = 'receptionist'
  AND NOT EXISTS (
      SELECT 1
      FROM clinic_staff_memberships
      WHERE clinic_staff_memberships.clinic_id = @default_clinic_id
        AND clinic_staff_memberships.user_id = users.id
  );

-- Review this result before enabling Clinic Admin access. Existing
-- platform admin accounts must remain Super Admins, not Clinic Admins.
SELECT
    clinic_staff_memberships.user_id,
    clinic_staff_memberships.clinic_id
FROM clinic_staff_memberships
JOIN users
    ON users.id = clinic_staff_memberships.user_id
WHERE clinic_staff_memberships.staff_role = 'clinic_admin'
  AND users.role <> 'clinic_admin';
