-- ============================================================
-- SmartClinic
-- Multi-Clinic Foundation: Clinics Table
-- ============================================================

USE smartclinic;

CREATE TABLE clinics (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NULL,
    contact VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
