-- ============================================================
-- SmartClinic
-- Multi-Clinic Foundation: Clinic Staff Memberships
-- ============================================================

USE smartclinic;

CREATE TABLE IF NOT EXISTS clinic_staff_memberships (
    id INT NOT NULL AUTO_INCREMENT,
    clinic_id INT NOT NULL,
    user_id INT NOT NULL,
    staff_role ENUM(
        'clinic_admin',
        'receptionist'
    ) NOT NULL,
    status ENUM(
        'active',
        'inactive'
    ) NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_clinic_staff_membership (
        clinic_id,
        user_id
    ),

    KEY ix_clinic_staff_memberships_clinic_id (
        clinic_id
    ),

    KEY ix_clinic_staff_memberships_user_id (
        user_id
    ),

    CONSTRAINT fk_clinic_staff_memberships_clinic
        FOREIGN KEY (clinic_id)
        REFERENCES clinics (id),

    CONSTRAINT fk_clinic_staff_memberships_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
);
