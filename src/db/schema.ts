import { pgTable, text, integer, boolean, doublePrecision, timestamp, bigint } from 'drizzle-orm/pg-core';

// 1. Users / Technicians & Admins
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID or system identifier
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('TECHNICIAN'), // TECHNICIAN | ADMIN | SUPER_ADMIN
  employeeId: text('employee_id'),
  phoneNumber: text('phone_number'),
  customExpectedStartTime: text('custom_expected_start_time'), // e.g. "07:30"
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Daily Clock-In Reports (Shared across all phones/devices)
export const dailyReports = pgTable('daily_reports', {
  id: text('id').primaryKey(),
  clientReportId: text('client_report_id').notNull().unique(),
  technicianId: text('technician_id').notNull().references(() => users.id),
  technicianName: text('technician_name').notNull(),
  employeeId: text('employee_id').notNull(),
  workDate: text('work_date').notNull(), // YYYY-MM-DD
  status: text('status').notNull().default('SYNCED'), // PENDING_SYNC | SYNCED | SYNC_FAILED
  submissionType: text('submission_type').notNull().default('ONLINE'), // ONLINE | OFFLINE_SYNC
  
  // Sacred Client Time vs Server Times
  officialClockInTime: text('official_clock_in_time').notNull(), // e.g. "07:42"
  serverReceivedAt: text('server_received_at').notNull(),
  serverSyncedAt: text('server_synced_at').notNull(),
  expectedStartTime: text('expected_start_time').notNull(), // e.g. "08:00"
  lateStatus: text('late_status').notNull().default('ON_TIME'), // ON_TIME | LATE | EXCUSED
  lateDurationMinutes: integer('late_duration_minutes').notNull().default(0),

  // GPS & Attestation
  latitude: doublePrecision('latitude').notNull().default(0),
  longitude: doublePrecision('longitude').notNull().default(0),
  locationAccuracyMeters: doublePrecision('location_accuracy_meters').notNull().default(0),
  rawGpsTimestamp: text('raw_gps_timestamp'),
  deviceMonotonicUptimeMs: bigint('device_monotonic_uptime_ms', { mode: 'number' }),
  isTimeTampered: boolean('is_time_tampered').notNull().default(false),
  tamperReason: text('tamper_reason'),

  // Stamped Photos & Answers (stored as structured JSON)
  photosJson: text('photos_json').notNull().default('[]'),
  ehsAnswersJson: text('ehs_answers_json').notNull().default('[]'),
  generalComments: text('general_comments'),
  identifiedHazards: text('identified_hazards'),

  // Administrative Override
  isOverridden: boolean('is_overridden').notNull().default(false),
  overrideReason: text('override_reason'),
  overriddenBy: text('overridden_by'),
  overriddenAt: text('overridden_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. EHS Inspection Questions
export const ehsQuestions = pgTable('ehs_questions', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  category: text('category').notNull(),
  questionText: text('question_text').notNull(),
  guidanceNotes: text('guidance_notes').notNull(),
  isMandatory: boolean('is_mandatory').notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

// 4. System Governance Settings
export const systemSettings = pgTable('system_settings', {
  id: integer('id').primaryKey(),
  defaultExpectedStartTime: text('default_expected_start_time').notNull().default('08:00'),
  gracePeriodMinutes: integer('grace_period_minutes').notNull().default(5),
  maxOfflineRetentionDays: integer('max_offline_retention_days').notNull().default(14),
  enforceGeofence: boolean('enforce_geofence').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Immutable Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').notNull(),
  actorName: text('actor_name').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  detailsJson: text('details_json').notNull().default('{}'),
  ipAddress: text('ip_address').notNull().default('127.0.0.1'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
