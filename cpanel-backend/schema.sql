-- =========================================================================
-- FieldPulse EHS Mobile Application - MySQL Database Schema
-- Target Platform: Standard cPanel Shared Hosting (MySQL 5.7+ / MariaDB 10.3+)
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- -------------------------------------------------------------------------
-- 1. Table structure for table `users`
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(64) NOT NULL,
  `uid` VARCHAR(128) DEFAULT NULL,
  `email` VARCHAR(191) NOT NULL,
  `full_name` VARCHAR(191) NOT NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'TECHNICIAN',
  `employee_id` VARCHAR(64) DEFAULT NULL,
  `phone_number` VARCHAR(64) DEFAULT NULL,
  `custom_expected_start_time` VARCHAR(16) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL DEFAULT '$2b$10$6izK0RnE0Uj7CVOzyn8AHuUfe8WmK8RWXf/djYPweeuEadVYW6qOC',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_uid` (`uid`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 1B. Table structure for table `user_sessions`
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_sessions`;
CREATE TABLE `user_sessions` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(64) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sessions_user` (`user_id`),
  KEY `idx_sessions_token` (`token_hash`),
  KEY `idx_sessions_expires` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 2. Table structure for table `daily_reports`
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS `daily_reports`;
CREATE TABLE `daily_reports` (
  `id` VARCHAR(64) NOT NULL,
  `client_report_id` VARCHAR(128) NOT NULL,
  `technician_id` VARCHAR(64) NOT NULL,
  `technician_name` VARCHAR(191) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `work_date` VARCHAR(16) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'SYNCED',
  `submission_type` VARCHAR(32) NOT NULL DEFAULT 'ONLINE',
  `official_clock_in_time` VARCHAR(64) NOT NULL,
  `server_received_at` VARCHAR(64) NOT NULL,
  `server_synced_at` VARCHAR(64) NOT NULL,
  `expected_start_time` VARCHAR(16) NOT NULL DEFAULT '08:00',
  `late_status` VARCHAR(32) NOT NULL DEFAULT 'ON_TIME',
  `late_duration_minutes` INT NOT NULL DEFAULT 0,
  `latitude` DOUBLE NOT NULL DEFAULT 0,
  `longitude` DOUBLE NOT NULL DEFAULT 0,
  `location_accuracy_meters` DOUBLE NOT NULL DEFAULT 0,
  `raw_gps_timestamp` VARCHAR(64) DEFAULT NULL,
  `device_monotonic_uptime_ms` BIGINT DEFAULT NULL,
  `is_time_tampered` TINYINT(1) NOT NULL DEFAULT 0,
  `tamper_reason` TEXT DEFAULT NULL,
  `photos_json` LONGTEXT NOT NULL,
  `ehs_answers_json` LONGTEXT NOT NULL,
  `general_comments` TEXT DEFAULT NULL,
  `identified_hazards` TEXT DEFAULT NULL,
  `is_overridden` TINYINT(1) NOT NULL DEFAULT 0,
  `override_reason` TEXT DEFAULT NULL,
  `overridden_by` VARCHAR(191) DEFAULT NULL,
  `overridden_at` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_client_report_id` (`client_report_id`),
  KEY `idx_reports_work_date` (`work_date`),
  KEY `idx_reports_tech_date` (`technician_id`, `work_date`),
  KEY `idx_reports_late_status` (`late_status`),
  KEY `idx_reports_submission_type` (`submission_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 3. Table structure for table `ehs_questions`
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS `ehs_questions`;
CREATE TABLE `ehs_questions` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `category` VARCHAR(128) NOT NULL,
  `question_text` TEXT NOT NULL,
  `guidance_notes` TEXT NOT NULL,
  `is_mandatory` TINYINT(1) NOT NULL DEFAULT 1,
  `display_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_ehs_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 4. Table structure for table `system_settings`
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` INT NOT NULL DEFAULT 1,
  `default_expected_start_time` VARCHAR(16) NOT NULL DEFAULT '08:00',
  `grace_period_minutes` INT NOT NULL DEFAULT 5,
  `max_offline_retention_days` INT NOT NULL DEFAULT 14,
  `enforce_geofence` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 5. Table structure for table `audit_logs`
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `actor_user_id` VARCHAR(64) NOT NULL,
  `actor_name` VARCHAR(191) NOT NULL,
  `action` VARCHAR(128) NOT NULL,
  `entity_type` VARCHAR(64) NOT NULL,
  `entity_id` VARCHAR(64) NOT NULL,
  `details_json` LONGTEXT NOT NULL,
  `ip_address` VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- SEED DATA INSERTION
-- =========================================================================

-- Insert Default Settings
INSERT INTO `system_settings` (`id`, `default_expected_start_time`, `grace_period_minutes`, `max_offline_retention_days`, `enforce_geofence`) 
VALUES (1, '08:00', 5, 14, 0)
ON DUPLICATE KEY UPDATE `default_expected_start_time` = VALUES(`default_expected_start_time`);

-- Insert Default Team Members & Technicians
INSERT INTO `users` (`id`, `uid`, `email`, `full_name`, `role`, `employee_id`, `phone_number`, `custom_expected_start_time`, `is_active`) VALUES
('usr-tech-01', 'usr-tech-01', 'carlos.mendez@fieldpulse.com', 'Carlos Mendez', 'TECHNICIAN', 'EMP-1042', '(415) 892-4410', NULL, 1),
('usr-tech-02', 'usr-tech-02', 'sarah.jenkins@fieldpulse.com', 'Sarah Jenkins', 'TECHNICIAN', 'EMP-1088', '(415) 773-1992', NULL, 1),
('usr-tech-03', 'usr-tech-03', 'marcus.thorne@fieldpulse.com', 'Marcus Thorne', 'TECHNICIAN', 'EMP-1105', '(510) 334-8022', NULL, 1),
('usr-tech-04', 'usr-tech-04', 'elena.rostova@fieldpulse.com', 'Elena Rostova', 'TECHNICIAN', 'EMP-1140', '(650) 419-7621', NULL, 1),
('usr-tech-05', 'usr-tech-05', 'david.kim@fieldpulse.com', 'David Kim', 'TECHNICIAN', 'EMP-1201', '(408) 552-9011', NULL, 1),
('usr-admin-01', 'usr-admin-01', 'rachel.hayes@fieldpulse.com', 'Rachel Hayes', 'SUPER_ADMIN', 'ADM-001', '(415) 555-0199', NULL, 1)
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- Insert Mandatory OSHA / EHS Checklist Questions
INSERT INTO `ehs_questions` (`id`, `code`, `category`, `question_text`, `guidance_notes`, `is_mandatory`, `display_order`, `is_active`) VALUES
('ehs-q1', 'PPE_INSPECTION', 'Personal Protective Equipment', 'Are you wearing approved hard hat, high-vis vest, safety glasses with side shields, and steel-toed boots?', 'ANSI Z89.1 Hard Hat and ASTM F2413 footwear mandatory for active jobsites.', 1, 1, 1),
('ehs-q2', 'TOOL_INSPECTION', 'Tools & Machinery', 'Are all hand/power tools inspected, safety guards functional, and cords free of frays or damage?', 'Remove damaged equipment from service immediately and tag OUT OF SERVICE.', 1, 2, 1),
('ehs-q3', 'VEHICLE_360', 'Fleet & Vehicle Safety', 'Has the 360-degree vehicle walk-around been completed (tire pressure, lights, fluid leaks, clean mirrors)?', 'Verify emergency road kit and first-aid supply box are onboard.', 1, 3, 1),
('ehs-q4', 'LADDER_SAFETY', 'Working at Heights', 'Is the ladder rated Type IA/IAA, rungs clean, non-skid feet intact, and 4:1 slope clearance verified?', 'Tie off top when extending beyond 12 feet. 3-point contact mandatory.', 1, 4, 1),
('ehs-q5', 'SITE_HAZARDS', 'Environmental & Site Hazards', 'Have site-specific electrical lines, open excavations, or chemical risks been surveyed and marked?', 'Confirm minimum 10-foot boundary from overhead power lines.', 1, 5, 1)
ON DUPLICATE KEY UPDATE `question_text` = VALUES(`question_text`);

-- Insert Initial Seed Reports for Today
INSERT INTO `daily_reports` (
  `id`, `client_report_id`, `technician_id`, `technician_name`, `employee_id`, `work_date`,
  `status`, `submission_type`, `official_clock_in_time`, `server_received_at`, `server_synced_at`,
  `expected_start_time`, `late_status`, `late_duration_minutes`, `latitude`, `longitude`,
  `location_accuracy_meters`, `raw_gps_timestamp`, `device_monotonic_uptime_ms`, `is_time_tampered`,
  `tamper_reason`, `photos_json`, `ehs_answers_json`, `general_comments`, `identified_hazards`,
  `is_overridden`, `override_reason`, `overridden_by`, `overridden_at`
) VALUES (
  'rep-seed-01', 'c29b71a0-98fc-4c4f-b648-9366df041499', 'usr-tech-01', 'Carlos Mendez', 'EMP-1042',
  CURDATE(), 'SYNCED', 'OFFLINE_SYNC', CONCAT(CURDATE(), 'T07:42:15.000Z'), CONCAT(CURDATE(), 'T09:15:22.000Z'),
  CONCAT(CURDATE(), 'T09:15:22.000Z'), '08:00', 'ON_TIME', 0, 37.774929, -122.419416, 4.8,
  CONCAT(CURDATE(), 'T07:42:14.000Z'), 348920150, 0, NULL,
  '[{\"id\":\"photo-01-ppe\",\"clientPhotoId\":\"p-01\",\"photoType\":\"PPE_SELFIE\",\"storageKey\":\"uploads/ppe_selfie.jpg\",\"dataUrl\":\"https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80\",\"fileSizeBytes\":642100,\"mimeType\":\"image/jpeg\",\"checksumSha256\":\"5f4dcc3b5aa765d61d8327deb882cf99a8\",\"capturedAt\":\"2026-09-15T07:38:10.000Z\",\"latitude\":37.774929,\"longitude\":-122.419416,\"isVerified\":true}]',
  '[{\"questionId\":\"ehs-q1\",\"isCompliant\":true},{\"questionId\":\"ehs-q2\",\"isCompliant\":true},{\"questionId\":\"ehs-q3\",\"isCompliant\":true},{\"questionId\":\"ehs-q4\",\"isCompliant\":true},{\"questionId\":\"ehs-q5\",\"isCompliant\":true}]',
  'Arrived at sub-station beta on schedule. Radio check completed with dispatch.', NULL, 0, NULL, NULL, NULL
),
(
  'rep-seed-02', 'd8312019-91a1-4322-8bf1-ffc728101a99', 'usr-tech-02', 'Sarah Jenkins', 'EMP-1088',
  CURDATE(), 'SYNCED', 'ONLINE', CONCAT(CURDATE(), 'T08:18:40.000Z'), CONCAT(CURDATE(), 'T08:18:40.000Z'),
  CONCAT(CURDATE(), 'T08:18:40.000Z'), '08:00', 'LATE', 18, 37.783333, -122.416667, 6.2,
  CONCAT(CURDATE(), 'T08:18:39.000Z'), 198210332, 0, NULL, '[]',
  '[{\"questionId\":\"ehs-q1\",\"isCompliant\":true},{\"questionId\":\"ehs-q2\",\"isCompliant\":true},{\"questionId\":\"ehs-q3\",\"isCompliant\":true},{\"questionId\":\"ehs-q4\",\"isCompliant\":true},{\"questionId\":\"ehs-q5\",\"isCompliant\":true}]',
  'Major freeway bottleneck on US-101 northbound.', NULL, 0, NULL, NULL, NULL
)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;
