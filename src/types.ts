export type UserRole = 'TECHNICIAN' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  employeeId?: string;
  phoneNumber?: string;
  customExpectedStartTime?: string;
  isActive: boolean;
  createdAt: string;
}

export interface EHSQuestion {
  id: string;
  code: string;
  category: string;
  questionText: string;
  guidanceNotes: string;
  isMandatory: boolean;
  displayOrder: number;
  isActive: boolean;
}

export type PhotoType = 'PPE_SELFIE' | 'TOOL_CHECK' | 'VEHICLE_CHECK' | 'LADDER_CHECK' | 'HAZARD_EVIDENCE';

export interface ReportPhoto {
  id: string;
  clientPhotoId: string;
  photoType: PhotoType;
  storageKey: string;
  dataUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  checksumSha256: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  isVerified: boolean;
}

export interface EHSAnswer {
  questionId: string;
  isCompliant: boolean;
  notes?: string;
}

export type SyncStatus = 'PENDING_SYNC' | 'SYNCED' | 'SYNC_FAILED';
export type SubmissionType = 'ONLINE' | 'OFFLINE_SYNC';
export type LateStatus = 'ON_TIME' | 'LATE' | 'EXCUSED';

export interface DailyReport {
  id: string;
  clientReportId: string;
  technicianId: string;
  technicianName: string;
  employeeId: string;
  workDate: string; // YYYY-MM-DD
  status: SyncStatus;
  submissionType: SubmissionType;
  
  // Sacred Client Time vs Server Sync Time
  officialClockInTime: string;      // Technician's device recorded time (e.g. 07:42)
  serverReceivedAt: string;         // When server received it
  serverSyncedAt: string;           // When sync was completed (e.g. 09:15)
  expectedStartTime: string;        // "08:00"
  lateStatus: LateStatus;
  lateDurationMinutes: number;

  // GPS & Monotonic Time Attestation
  latitude: number;
  longitude: number;
  locationAccuracyMeters: number;
  rawGpsTimestamp?: string;
  deviceMonotonicUptimeMs?: number;
  isTimeTampered: boolean;
  tamperReason?: string;

  // Attached Evidence
  photos: ReportPhoto[];
  ehsAnswers: EHSAnswer[];
  generalComments?: string;
  identifiedHazards?: string;

  // Administrative Override
  isOverridden: boolean;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  id: number;
  defaultExpectedStartTime: string;
  gracePeriodMinutes: number;
  maxOfflineRetentionDays: number;
  enforceGeofence: boolean;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  ipAddress: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalTechnicians: number;
  clockedIn: number;
  notClockedIn: number;
  onTime: number;
  late: number;
  offlineSynced: number;
  pendingSync: number;
  syncFailures: number;
  todayDate: string;
  defaultExpectedStartTime: string;
}

// Local Storage / SQLite sync queue item representing a report created while offline
export interface OfflineSyncQueueItem {
  clientReportId: string;
  technicianId: string;
  workDate: string;
  clockIn: {
    recordedAt: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    rawGpsTimestamp?: string;
    deviceMonotonicUptimeMs: number;
  };
  photos: ReportPhoto[];
  ehsAnswers: EHSAnswer[];
  generalComments?: string;
  identifiedHazards?: string;
  retryCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  createdAt: string;
}
