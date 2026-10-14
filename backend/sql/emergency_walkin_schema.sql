-- ============================================================
-- SmartClinic
-- Emergency Walk-In + Standalone Emergency Patient Support
-- ============================================================

USE smartclinic;

-- ------------------------------------------------------------
-- APPOINTMENTS
-- Emergency walk-ins do not require a scheduled slot.
-- ------------------------------------------------------------

ALTER TABLE appointments
MODIFY COLUMN slot_id INT NULL;

ALTER TABLE appointments
ADD COLUMN booking_source
ENUM('scheduled', 'walk_in')
NOT NULL
DEFAULT 'scheduled';


-- ------------------------------------------------------------
-- PATIENTS
-- Registered patients have a linked User account.
-- Front-desk emergency patients may exist without one.
-- ------------------------------------------------------------

ALTER TABLE patients
MODIFY COLUMN user_id INT NULL;

ALTER TABLE patients
ADD COLUMN name VARCHAR(100) NULL AFTER user_id;
