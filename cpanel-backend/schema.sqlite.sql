-- =========================================================================
-- FieldPulse EHS Mobile Application - SQLite Database Schema & Seed Data
-- Portable, single-file zero-configuration database (Drop-in for PHP or local runtimes)
-- =========================================================================

PRAGMA foreign_keys = ON;

-- -------------------------------------------------------------------------
-- 1. USERS & ROLES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    uid TEXT,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'TECHNICIAN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'TECHNICIAN')),
    employee_id TEXT UNIQUE,
    phone_number TEXT,
    custom_expected_start_time TEXT,
    password_hash TEXT NOT NULL DEFAULT '$2b$10$6izK0RnE0Uj7CVOzyn8AHuUfe8WmK8RWXf/djYPweeuEadVYW6qOC',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- -------------------------------------------------------------------------
-- 1B. USER SESSIONS & AUTHENTICATION TOKENS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- -------------------------------------------------------------------------
-- 2. DAILY REPORTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_reports (
    id TEXT PRIMARY KEY,
    client_report_id TEXT NOT NULL UNIQUE,
    technician_id TEXT NOT NULL,
    technician_name TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    work_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SYNCED' CHECK (status IN ('DRAFT', 'PENDING_SYNC', 'SYNCED', 'SYNC_FAILED')),
    submission_type TEXT NOT NULL DEFAULT 'ONLINE' CHECK (submission_type IN ('ONLINE', 'OFFLINE_SYNC')),
    official_clock_in_time TEXT NOT NULL,
    server_received_at TEXT NOT NULL,
    server_synced_at TEXT NOT NULL,
    expected_start_time TEXT NOT NULL DEFAULT '08:00',
    late_status TEXT NOT NULL DEFAULT 'ON_TIME' CHECK (late_status IN ('ON_TIME', 'LATE', 'EXCUSED')),
    late_duration_minutes INTEGER NOT NULL DEFAULT 0,
    latitude REAL NOT NULL DEFAULT 0.0,
    longitude REAL NOT NULL DEFAULT 0.0,
    location_accuracy_meters REAL NOT NULL DEFAULT 0.0,
    raw_gps_timestamp TEXT,
    device_monotonic_uptime_ms INTEGER,
    is_time_tampered INTEGER NOT NULL DEFAULT 0,
    tamper_reason TEXT,
    photos_json TEXT NOT NULL DEFAULT '[]',
    ehs_answers_json TEXT NOT NULL DEFAULT '[]',
    general_comments TEXT,
    identified_hazards TEXT,
    is_overridden INTEGER NOT NULL DEFAULT 0,
    override_reason TEXT,
    overridden_by TEXT,
    overridden_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_reports_tech_date ON daily_reports(technician_id, work_date);
CREATE INDEX IF NOT EXISTS idx_reports_clock_in ON daily_reports(official_clock_in_time);
CREATE INDEX IF NOT EXISTS idx_reports_status ON daily_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_late ON daily_reports(late_status);
CREATE INDEX IF NOT EXISTS idx_reports_submission ON daily_reports(submission_type);

-- -------------------------------------------------------------------------
-- 3. EHS QUESTIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ehs_questions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('PPE', 'VEHICLE', 'SITE_SAFETY', 'EQUIPMENT', 'ENVIRONMENTAL')),
    question_text TEXT NOT NULL,
    guidance_notes TEXT NOT NULL,
    is_mandatory INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ehs_display_order ON ehs_questions(display_order);

-- -------------------------------------------------------------------------
-- 4. SYSTEM SETTINGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    default_expected_start_time TEXT NOT NULL DEFAULT '08:00',
    grace_period_minutes INTEGER NOT NULL DEFAULT 5,
    max_offline_retention_days INTEGER NOT NULL DEFAULT 14,
    enforce_geofence INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 5. AUDIT LOGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details_json TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- =========================================================================
-- INITIAL SEED DATA
-- =========================================================================

-- Seed System Settings
INSERT OR IGNORE INTO system_settings (id, default_expected_start_time, grace_period_minutes, max_offline_retention_days, enforce_geofence)
VALUES (1, '08:00', 5, 14, 0);

-- Seed System Users (Admin & Field Technicians - All pre-configured with default hashed PIN 7842)
INSERT OR IGNORE INTO users (id, uid, email, full_name, role, employee_id, phone_number, custom_expected_start_time, password_hash, is_active) VALUES
('usr-admin-01', 'usr-admin-01', 'rachel.hayes@spectrum-ehs.com', 'Rachel Hayes', 'SUPER_ADMIN', 'SE-ADMIN-01', '(415) 555-0199', NULL, '$2b$10$6izK0RnE0Uj7CVOzyn8AHuUfe8WmK8RWXf/djYPweeuEadVYW6qOC', 1),
('usr-admin-02', 'usr-admin-02', 'marcus.vance@spectrum-ehs.com', 'Marcus Vance', 'ADMIN', 'SE-ADMIN-02', '(415) 555-0188', NULL, '$2b$10$6izK0RnE0Uj7CVOzyn8AHuUfe8WmK8RWXf/djYPweeuEadVYW6qOC', 1),
('usr-tech-01', 'usr-tech-01', 'carlos.mendez@spectrum-ehs.com', 'Carlos Mendez', 'TECHNICIAN', 'SE-1042', '(415) 892-4410', '07:30', '$2b$10$6izK0RnE0Uj7CVOzyn8AHuUfe8WmK8RWXf/djYPweeuEadVYW6qOC', 1),
('usr-tech-02', 'usr-tech-02', 'marcus.rodriguez@spectrum-ehs.com', 'Marcus Rodriguez', 'TECHNICIAN', 'SE-7842', '(415) 720-3391', '08:00', '$2b$10$6izK0RnE0Uj7CVOzyn8AHuUfe8WmK8RWXf/djYPweeuEadVYW6qOC', 1),
('usr-tech-03', 'usr-tech-03', 'sarah.chen@spectrum-ehs.com', 'Sarah Chen', 'TECHNICIAN', 'SE-5021', '(415) 441-9982', '08:00', '$2b$10$6izK0RnE0Uj7CVOzyn8AHuUfe8WmK8RWXf/djYPweeuEadVYW6qOC', 1),
('usr-tech-04', 'usr-tech-04', 'elena.rostova@spectrum-ehs.com', 'Elena Rostova', 'TECHNICIAN', 'SE-1155', '(555) 567-8901', '08:30', '$2b$10$6izK0RnE0Uj7CVOzyn8AHuUfe8WmK8RWXf/djYPweeuEadVYW6qOC', 1);

-- Seed Mandatory EHS Safety Questions
INSERT OR IGNORE INTO ehs_questions (id, code, category, question_text, guidance_notes, is_mandatory, display_order, is_active) VALUES
('ehs-q1', 'PPE_HEAD_EYES', 'PPE', 'Are you wearing an ANSI-approved hard hat and safety glasses with side shields?', 'Ensure chin strap is secure if working at elevation; inspect shell for cracks or UV degradation.', 1, 1, 1),
('ehs-q2', 'PPE_FOOTWEAR', 'PPE', 'Are you equipped with ASTM F2413 compliant steel/composite toe boots in good condition?', 'Check for sole wear, oil-resistant tread integrity, and proper ankle lace support.', 1, 2, 1),
('ehs-q3', 'PPE_HIGH_VIS', 'PPE', 'Are you wearing Class 2 or Class 3 high-visibility reflective outerwear?', 'Required for all roadside, utility corridor, and active equipment work zones.', 1, 3, 1),
('ehs-q4', 'VEHICLE_INSPECT', 'VEHICLE', 'Has the pre-trip 360-degree vehicle inspection been completed with zero critical defects?', 'Verify brake fluid, tire pressure/tread, turn signals, reverse beeper, and hazard lights.', 1, 4, 1),
('ehs-q5', 'GAS_DETECTOR_CAL', 'EQUIPMENT', 'Has your 4-gas portable atmospheric monitor undergone a successful bump test today?', 'Mandatory bump test with certified quad-gas mix prior to any confined space or trench entry.', 1, 5, 1),
('ehs-q6', 'FIRST_AID_SPILL', 'SITE_SAFETY', 'Are vehicle first aid kit, dry-chemical fire extinguisher, and chemical spill kit accessible?', 'Verify inspection tags are current and seal pins are unbroken.', 1, 6, 1);
