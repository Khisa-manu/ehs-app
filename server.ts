import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// -------------------------------------------------------------
// IN-MEMORY / PERSISTENT PRODUCTION-GRADE DATA STORE
// -------------------------------------------------------------

export interface SystemSettings {
  id: number;
  defaultExpectedStartTime: string; // "08:00"
  gracePeriodMinutes: number;       // 5
  maxOfflineRetentionDays: number;  // 14
  enforceGeofence: boolean;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'TECHNICIAN' | 'ADMIN' | 'SUPER_ADMIN';
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

export interface ReportPhoto {
  id: string;
  clientPhotoId: string;
  photoType: 'PPE_SELFIE' | 'TOOL_CHECK' | 'VEHICLE_CHECK' | 'LADDER_CHECK' | 'HAZARD_EVIDENCE';
  storageKey: string;
  dataUrl?: string; // base64 or secure preview url
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

export interface DailyReport {
  id: string;
  clientReportId: string;
  technicianId: string;
  technicianName: string;
  employeeId: string;
  workDate: string; // YYYY-MM-DD
  status: 'PENDING_SYNC' | 'SYNCED' | 'SYNC_FAILED';
  submissionType: 'ONLINE' | 'OFFLINE_SYNC';
  
  // Clock-in exact timestamps
  officialClockInTime: string;      // Technician's device recorded time
  serverReceivedAt: string;         // Time ingested by server
  serverSyncedAt: string;           // Time synchronization completed
  expectedStartTime: string;        // "08:00"
  lateStatus: 'ON_TIME' | 'LATE' | 'EXCUSED';
  lateDurationMinutes: number;

  // GPS & Device Attestation
  latitude: number;
  longitude: number;
  locationAccuracyMeters: number;
  rawGpsTimestamp?: string;
  deviceMonotonicUptimeMs?: number;
  isTimeTampered: boolean;
  tamperReason?: string;

  // Photos & EHS
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

// Global state container
const state: {
  settings: SystemSettings;
  users: User[];
  ehsQuestions: EHSQuestion[];
  reports: DailyReport[];
  auditLogs: AuditLog[];
} = {
  settings: {
    id: 1,
    defaultExpectedStartTime: '08:00',
    gracePeriodMinutes: 5,
    maxOfflineRetentionDays: 14,
    enforceGeofence: false,
    updatedAt: new Date().toISOString(),
  },
  users: [
    {
      id: 'usr-tech-01',
      email: 'carlos.mendez@fieldpulse.com',
      fullName: 'Carlos Mendez',
      role: 'TECHNICIAN',
      employeeId: 'EMP-1042',
      phoneNumber: '(415) 892-4410',
      isActive: true,
      createdAt: '2025-01-10T08:00:00Z',
    },
    {
      id: 'usr-tech-02',
      email: 'sarah.jenkins@fieldpulse.com',
      fullName: 'Sarah Jenkins',
      role: 'TECHNICIAN',
      employeeId: 'EMP-1088',
      phoneNumber: '(415) 773-1992',
      isActive: true,
      createdAt: '2025-01-15T08:00:00Z',
    },
    {
      id: 'usr-tech-03',
      email: 'marcus.thorne@fieldpulse.com',
      fullName: 'Marcus Thorne',
      role: 'TECHNICIAN',
      employeeId: 'EMP-1105',
      phoneNumber: '(510) 334-8022',
      isActive: true,
      createdAt: '2025-02-01T08:00:00Z',
    },
    {
      id: 'usr-tech-04',
      email: 'elena.rostova@fieldpulse.com',
      fullName: 'Elena Rostova',
      role: 'TECHNICIAN',
      employeeId: 'EMP-1140',
      phoneNumber: '(650) 419-7621',
      isActive: true,
      createdAt: '2025-02-12T08:00:00Z',
    },
    {
      id: 'usr-tech-05',
      email: 'david.kim@fieldpulse.com',
      fullName: 'David Kim',
      role: 'TECHNICIAN',
      employeeId: 'EMP-1201',
      phoneNumber: '(408) 552-9011',
      isActive: true,
      createdAt: '2025-03-01T08:00:00Z',
    },
    {
      id: 'usr-admin-01',
      email: 'rachel.hayes@fieldpulse.com',
      fullName: 'Rachel Hayes',
      role: 'SUPER_ADMIN',
      phoneNumber: '(415) 555-0199',
      isActive: true,
      createdAt: '2024-11-01T08:00:00Z',
    },
  ],
  ehsQuestions: [
    {
      id: 'ehs-q1',
      code: 'PPE_INSPECTION',
      category: 'Personal Protective Equipment',
      questionText: 'Are you wearing approved hard hat, high-vis vest, safety glasses with side shields, and steel-toed boots?',
      guidanceNotes: 'ANSI Z89.1 Hard Hat and ASTM F2413 footwear mandatory for active jobsites.',
      isMandatory: true,
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'ehs-q2',
      code: 'TOOL_INSPECTION',
      category: 'Tools & Machinery',
      questionText: 'Are all hand/power tools inspected, safety guards functional, and cords free of frays or damage?',
      guidanceNotes: 'Remove damaged equipment from service immediately and tag OUT OF SERVICE.',
      isMandatory: true,
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'ehs-q3',
      code: 'VEHICLE_360',
      category: 'Fleet & Vehicle Safety',
      questionText: 'Has the 360-degree vehicle walk-around been completed (tire pressure, lights, fluid leaks, clean mirrors)?',
      guidanceNotes: 'Verify emergency road kit and first-aid supply box are onboard.',
      isMandatory: true,
      displayOrder: 3,
      isActive: true,
    },
    {
      id: 'ehs-q4',
      code: 'LADDER_SAFETY',
      category: 'Working at Heights',
      questionText: 'Is the ladder rated Type IA/IAA, rungs clean, non-skid feet intact, and 4:1 slope clearance verified?',
      guidanceNotes: 'Tie off top when extending beyond 12 feet. 3-point contact mandatory.',
      isMandatory: true,
      displayOrder: 4,
      isActive: true,
    },
    {
      id: 'ehs-q5',
      code: 'SITE_HAZARDS',
      category: 'Environmental & Site Hazards',
      questionText: 'Have site-specific electrical lines, open excavations, or chemical risks been surveyed and marked?',
      guidanceNotes: 'Confirm minimum 10-foot boundary from overhead power lines.',
      isMandatory: true,
      displayOrder: 5,
      isActive: true,
    },
  ],
  reports: [],
  auditLogs: [],
};

// Seed realistic sample reports (including the user's explicit example scenario:
// "Technician completes clock-in at 07:42 while offline. Internet becomes available at 09:15.
// Original clock-in time: 07:42, Synchronization time: 09:15, Submission type: Offline Sync")
function seedInitialData() {
  const today = new Date().toISOString().split('T')[0];
  
  // Sample 1: The exact prompt specification! Carlos Mendez clocked in offline at 07:42, synced at 09:15
  const sample1: DailyReport = {
    id: 'rep-seed-01',
    clientReportId: 'c62bf679-63a2-4a0b-8d69-cfec027581e2',
    technicianId: 'usr-tech-01',
    technicianName: 'Carlos Mendez',
    employeeId: 'EMP-1042',
    workDate: today,
    status: 'SYNCED',
    submissionType: 'OFFLINE_SYNC',
    officialClockInTime: `${today}T07:42:15.000Z`,
    serverReceivedAt: `${today}T09:15:22.000Z`,
    serverSyncedAt: `${today}T09:15:22.000Z`,
    expectedStartTime: '08:00',
    lateStatus: 'ON_TIME',
    lateDurationMinutes: 0,
    latitude: 37.774929,
    longitude: -122.419416,
    locationAccuracyMeters: 4.8,
    rawGpsTimestamp: `${today}T07:42:14.000Z`,
    deviceMonotonicUptimeMs: 348920150,
    isTimeTampered: false,
    photos: [
      {
        id: 'photo-01-ppe',
        clientPhotoId: 'p-01',
        photoType: 'PPE_SELFIE',
        storageKey: `uploads/${today}/carlos/ppe_selfie.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 642100,
        mimeType: 'image/jpeg',
        checksumSha256: '5f4dcc3b5aa765d61d8327deb882cf99a8',
        capturedAt: `${today}T07:38:10.000Z`,
        latitude: 37.774929,
        longitude: -122.419416,
        isVerified: true,
      },
      {
        id: 'photo-01-tool',
        clientPhotoId: 'p-02',
        photoType: 'TOOL_CHECK',
        storageKey: `uploads/${today}/carlos/tool_check.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 712000,
        mimeType: 'image/jpeg',
        checksumSha256: '8b1a9953c4611296a827abf8c47804d7e2',
        capturedAt: `${today}T07:39:40.000Z`,
        latitude: 37.774929,
        longitude: -122.419416,
        isVerified: true,
      },
      {
        id: 'photo-01-veh',
        clientPhotoId: 'p-03',
        photoType: 'VEHICLE_CHECK',
        storageKey: `uploads/${today}/carlos/vehicle_check.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 820400,
        mimeType: 'image/jpeg',
        checksumSha256: '1a79a4d60de6718e8e5b326e338ae533f0',
        capturedAt: `${today}T07:40:55.000Z`,
        latitude: 37.774929,
        longitude: -122.419416,
        isVerified: true,
      },
      {
        id: 'photo-01-lad',
        clientPhotoId: 'p-04',
        photoType: 'LADDER_CHECK',
        storageKey: `uploads/${today}/carlos/ladder_check.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 594000,
        mimeType: 'image/jpeg',
        checksumSha256: 'c329d48b39414a3e819a58498f316e641b',
        capturedAt: `${today}T07:41:40.000Z`,
        latitude: 37.774929,
        longitude: -122.419416,
        isVerified: true,
      },
    ],
    ehsAnswers: [
      { questionId: 'ehs-q1', isCompliant: true },
      { questionId: 'ehs-q2', isCompliant: true },
      { questionId: 'ehs-q3', isCompliant: true },
      { questionId: 'ehs-q4', isCompliant: true },
      { questionId: 'ehs-q5', isCompliant: true, notes: 'Substation fence inspected.' },
    ],
    generalComments: 'Remote cell tower site B-14. Zero mobile reception upon arrival; recorded all checklist items and photos locally.',
    identifiedHazards: 'Wet gravel on the access incline.',
    isOverridden: false,
    createdAt: `${today}T07:42:15.000Z`,
    updatedAt: `${today}T09:15:22.000Z`,
  };

  // Sample 2: Sarah Jenkins clocked in online, ON TIME (07:55 AM)
  const sample2: DailyReport = {
    id: 'rep-seed-02',
    clientReportId: '7f99b244-1234-45aa-91cc-dd1122334455',
    technicianId: 'usr-tech-02',
    technicianName: 'Sarah Jenkins',
    employeeId: 'EMP-1088',
    workDate: today,
    status: 'SYNCED',
    submissionType: 'ONLINE',
    officialClockInTime: `${today}T07:55:04.000Z`,
    serverReceivedAt: `${today}T07:55:05.000Z`,
    serverSyncedAt: `${today}T07:55:05.000Z`,
    expectedStartTime: '08:00',
    lateStatus: 'ON_TIME',
    lateDurationMinutes: 0,
    latitude: 37.783333,
    longitude: -122.416667,
    locationAccuracyMeters: 3.2,
    rawGpsTimestamp: `${today}T07:55:04.000Z`,
    deviceMonotonicUptimeMs: 142095810,
    isTimeTampered: false,
    photos: [
      {
        id: 'photo-02-ppe',
        clientPhotoId: 'p-21',
        photoType: 'PPE_SELFIE',
        storageKey: `uploads/${today}/sarah/ppe_selfie.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 610500,
        mimeType: 'image/jpeg',
        checksumSha256: '9a9b9c9d9e9f0102030405060708090a',
        capturedAt: `${today}T07:51:10.000Z`,
        latitude: 37.783333,
        longitude: -122.416667,
        isVerified: true,
      },
      {
        id: 'photo-02-tool',
        clientPhotoId: 'p-22',
        photoType: 'TOOL_CHECK',
        storageKey: `uploads/${today}/sarah/tool_check.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 695000,
        mimeType: 'image/jpeg',
        checksumSha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        capturedAt: `${today}T07:52:30.000Z`,
        latitude: 37.783333,
        longitude: -122.416667,
        isVerified: true,
      },
      {
        id: 'photo-02-veh',
        clientPhotoId: 'p-23',
        photoType: 'VEHICLE_CHECK',
        storageKey: `uploads/${today}/sarah/vehicle_check.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 750200,
        mimeType: 'image/jpeg',
        checksumSha256: 'f0e1d2c3b4a5968778695a4b3c2d1e0f',
        capturedAt: `${today}T07:53:45.000Z`,
        latitude: 37.783333,
        longitude: -122.416667,
        isVerified: true,
      },
      {
        id: 'photo-02-lad',
        clientPhotoId: 'p-24',
        photoType: 'LADDER_CHECK',
        storageKey: `uploads/${today}/sarah/ladder_check.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 580100,
        mimeType: 'image/jpeg',
        checksumSha256: '112233445566778899aabbccddeeff00',
        capturedAt: `${today}T07:54:30.000Z`,
        latitude: 37.783333,
        longitude: -122.416667,
        isVerified: true,
      },
    ],
    ehsAnswers: [
      { questionId: 'ehs-q1', isCompliant: true },
      { questionId: 'ehs-q2', isCompliant: true },
      { questionId: 'ehs-q3', isCompliant: true },
      { questionId: 'ehs-q4', isCompliant: true },
      { questionId: 'ehs-q5', isCompliant: true },
    ],
    generalComments: 'Urban telecom hub installation.',
    isOverridden: false,
    createdAt: `${today}T07:55:04.000Z`,
    updatedAt: `${today}T07:55:05.000Z`,
  };

  // Sample 3: Marcus Thorne clocked in LATE (08:34 AM, expected 08:00)
  const sample3: DailyReport = {
    id: 'rep-seed-03',
    clientReportId: '33aa55cc-9988-7766-5544-33221100aabb',
    technicianId: 'usr-tech-03',
    technicianName: 'Marcus Thorne',
    employeeId: 'EMP-1105',
    workDate: today,
    status: 'SYNCED',
    submissionType: 'ONLINE',
    officialClockInTime: `${today}T08:34:12.000Z`,
    serverReceivedAt: `${today}T08:34:13.000Z`,
    serverSyncedAt: `${today}T08:34:13.000Z`,
    expectedStartTime: '08:00',
    lateStatus: 'LATE',
    lateDurationMinutes: 34,
    latitude: 37.804363,
    longitude: -122.271111,
    locationAccuracyMeters: 5.1,
    rawGpsTimestamp: `${today}T08:34:12.000Z`,
    deviceMonotonicUptimeMs: 89012340,
    isTimeTampered: false,
    photos: [
      {
        id: 'photo-03-ppe',
        clientPhotoId: 'p-31',
        photoType: 'PPE_SELFIE',
        storageKey: `uploads/${today}/marcus/ppe_selfie.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 620000,
        mimeType: 'image/jpeg',
        checksumSha256: '445566778899aabbccddeeff00112233',
        capturedAt: `${today}T08:30:10.000Z`,
        latitude: 37.804363,
        longitude: -122.271111,
        isVerified: true,
      },
      {
        id: 'photo-03-tool',
        clientPhotoId: 'p-32',
        photoType: 'TOOL_CHECK',
        storageKey: `uploads/${today}/marcus/tool_check.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 710000,
        mimeType: 'image/jpeg',
        checksumSha256: '5566778899aabbccddeeff0011223344',
        capturedAt: `${today}T08:31:30.000Z`,
        latitude: 37.804363,
        longitude: -122.271111,
        isVerified: true,
      },
      {
        id: 'photo-03-veh',
        clientPhotoId: 'p-33',
        photoType: 'VEHICLE_CHECK',
        storageKey: `uploads/${today}/marcus/vehicle_check.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 805000,
        mimeType: 'image/jpeg',
        checksumSha256: '66778899aabbccddeeff001122334455',
        capturedAt: `${today}T08:32:50.000Z`,
        latitude: 37.804363,
        longitude: -122.271111,
        isVerified: true,
      },
      {
        id: 'photo-03-lad',
        clientPhotoId: 'p-34',
        photoType: 'LADDER_CHECK',
        storageKey: `uploads/${today}/marcus/ladder_check.jpg`,
        dataUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
        fileSizeBytes: 590000,
        mimeType: 'image/jpeg',
        checksumSha256: '778899aabbccddeeff00112233445566',
        capturedAt: `${today}T08:33:45.000Z`,
        latitude: 37.804363,
        longitude: -122.271111,
        isVerified: true,
      },
    ],
    ehsAnswers: [
      { questionId: 'ehs-q1', isCompliant: true },
      { questionId: 'ehs-q2', isCompliant: true },
      { questionId: 'ehs-q3', isCompliant: true },
      { questionId: 'ehs-q4', isCompliant: true },
      { questionId: 'ehs-q5', isCompliant: true },
    ],
    generalComments: 'Highway traffic delay on I-880.',
    isOverridden: false,
    createdAt: `${today}T08:34:12.000Z`,
    updatedAt: `${today}T08:34:13.000Z`,
  };

  state.reports = [sample1, sample2, sample3];

  state.auditLogs = [
    {
      id: 'log-01',
      actorUserId: 'usr-admin-01',
      actorName: 'Rachel Hayes',
      action: 'SYSTEM_BOOTSTRAP',
      entityType: 'SYSTEM',
      entityId: 'config-1',
      details: { message: 'Initialized FieldPulse EHS & Clock-In service with default 08:00 AM policy.' },
      ipAddress: '127.0.0.1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'log-02',
      actorUserId: 'usr-tech-01',
      actorName: 'Carlos Mendez',
      action: 'OFFLINE_REPORT_SYNCED',
      entityType: 'DAILY_REPORT',
      entityId: sample1.id,
      details: {
        officialClockIn: sample1.officialClockInTime,
        serverSynced: sample1.serverSyncedAt,
        type: 'OFFLINE_SYNC',
        delayMinutes: 93,
      },
      ipAddress: '192.168.1.42',
      createdAt: sample1.serverSyncedAt,
    },
  ];
}

seedInitialData();

// Helper: Evaluate late status based on expected start time and grace period
export function evaluateLateStatus(
  recordedIso: string,
  expectedTimeStr: string, // e.g. "08:00"
  graceMinutes: number
): { isLate: boolean; lateMinutes: number } {
  try {
    const recordedDate = new Date(recordedIso);
    const [expHours, expMins] = expectedTimeStr.split(':').map(Number);
    
    // Create expected Date on the same calendar day (in UTC/local representation)
    const expectedDate = new Date(recordedDate);
    expectedDate.setUTCHours(expHours, expMins, 0, 0);

    const diffMs = recordedDate.getTime() - expectedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins > graceMinutes) {
      return { isLate: true, lateMinutes: diffMins };
    }
    return { isLate: false, lateMinutes: 0 };
  } catch {
    return { isLate: false, lateMinutes: 0 };
  }
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'FieldPulse EHS & Clock-In Core API',
  });
});

// 2. Auth: Mock login with user credential matching
app.post('/api/v1/auth/login', (req, res) => {
  const { email, role } = req.body;
  
  let matchedUser = state.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  
  if (!matchedUser) {
    if (role === 'ADMIN') {
      matchedUser = state.users.find(u => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN');
    } else {
      matchedUser = state.users.find(u => u.role === 'TECHNICIAN');
    }
  }

  if (!matchedUser) {
    return res.status(401).json({ success: false, error: 'Invalid user or role' });
  }

  res.json({
    success: true,
    data: {
      user: matchedUser,
      token: `fp_jwt_${matchedUser.id}_${Date.now()}`,
      expiresIn: 3600 * 24,
    },
  });
});

// 3. EHS Questions
app.get('/api/v1/ehs/questions', (req, res) => {
  res.json({
    success: true,
    data: state.ehsQuestions.filter(q => q.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
  });
});

// 4. Technicians List & Management
app.get('/api/v1/technicians', (req, res) => {
  const techs = state.users.filter(u => u.role === 'TECHNICIAN');
  res.json({ success: true, data: techs });
});

app.post('/api/v1/technicians', (req, res) => {
  const { fullName, email, employeeId, phoneNumber, customExpectedStartTime } = req.body;
  
  if (!fullName || !email || !employeeId) {
    return res.status(400).json({ success: false, error: 'Full name, email, and employee ID are required.' });
  }

  // Check unique employeeId
  const existing = state.users.find(u => u.employeeId === employeeId || u.email === email);
  if (existing) {
    return res.status(409).json({ success: false, error: 'Technician with this Employee ID or Email already exists.' });
  }

  const newTech: User = {
    id: `usr-tech-${Date.now()}`,
    email,
    fullName,
    role: 'TECHNICIAN',
    employeeId,
    phoneNumber: phoneNumber || '',
    customExpectedStartTime: customExpectedStartTime || undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  state.users.push(newTech);

  // Audit log
  state.auditLogs.unshift({
    id: `log-${Date.now()}`,
    actorUserId: 'usr-admin-01',
    actorName: 'Rachel Hayes',
    action: 'TECHNICIAN_CREATED',
    entityType: 'TECHNICIAN',
    entityId: newTech.id,
    details: { employeeId: newTech.employeeId, fullName: newTech.fullName },
    ipAddress: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ success: true, data: newTech });
});

app.patch('/api/v1/technicians/:id', (req, res) => {
  const { id } = req.params;
  const tech = state.users.find(u => u.id === id);
  if (!tech) return res.status(404).json({ success: false, error: 'Technician not found' });

  const { isActive, fullName, phoneNumber, customExpectedStartTime } = req.body;
  if (typeof isActive === 'boolean') tech.isActive = isActive;
  if (fullName) tech.fullName = fullName;
  if (phoneNumber !== undefined) tech.phoneNumber = phoneNumber;
  if (customExpectedStartTime !== undefined) tech.customExpectedStartTime = customExpectedStartTime;

  state.auditLogs.unshift({
    id: `log-${Date.now()}`,
    actorUserId: 'usr-admin-01',
    actorName: 'Rachel Hayes',
    action: 'TECHNICIAN_UPDATED',
    entityType: 'TECHNICIAN',
    entityId: tech.id,
    details: req.body,
    ipAddress: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, data: tech });
});

app.delete('/api/v1/technicians/:id', (req, res) => {
  const { id } = req.params;
  const index = state.users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ success: false, error: 'Technician not found' });

  const removedTech = state.users[index];
  state.users.splice(index, 1);

  state.auditLogs.unshift({
    id: `log-${Date.now()}`,
    actorUserId: 'usr-admin-01',
    actorName: 'Rachel Hayes',
    action: 'TECHNICIAN_REMOVED',
    entityType: 'TECHNICIAN',
    entityId: removedTech.id,
    details: { employeeId: removedTech.employeeId, fullName: removedTech.fullName },
    ipAddress: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, message: `Technician ${removedTech.fullName} removed successfully.` });
});

// 5. Presigned URL / Media Upload
app.post('/api/v1/photos/presign-upload', (req, res) => {
  const { photoType, clientPhotoId, mimeType } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `uploads/${today}/${photoType.toLowerCase()}_${clientPhotoId || Date.now()}.jpg`;

  res.json({
    success: true,
    data: {
      storageKey,
      uploadUrl: `/api/v1/photos/upload-direct?key=${encodeURIComponent(storageKey)}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    },
  });
});

// 6. Direct Photo Upload Handler
app.post('/api/v1/photos/upload-direct', (req, res) => {
  const { dataUrl, photoType, clientPhotoId, capturedAt, latitude, longitude } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `uploads/${today}/${photoType || 'photo'}_${clientPhotoId || Date.now()}.jpg`;

  const newPhoto: ReportPhoto = {
    id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    clientPhotoId: clientPhotoId || `p-${Date.now()}`,
    photoType: photoType || 'PPE_SELFIE',
    storageKey,
    dataUrl: dataUrl || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80',
    fileSizeBytes: dataUrl ? Math.round((dataUrl.length * 3) / 4) : 500000,
    mimeType: 'image/jpeg',
    checksumSha256: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    capturedAt: capturedAt || new Date().toISOString(),
    latitude: latitude || 37.7749,
    longitude: longitude || -122.4194,
    isVerified: true,
  };

  res.json({ success: true, data: newPhoto });
});

// 7. CORE IDEMPOTENT OFFLINE / ONLINE SYNC BATCH HANDLER
app.post('/api/v1/sync/batch', (req, res) => {
  const {
    clientReportId,
    technicianId,
    workDate,
    clockIn,
    photos,
    ehsAnswers,
    generalComments,
    identifiedHazards,
  } = req.body;

  if (!clientReportId || !technicianId || !clockIn || !clockIn.recordedAt) {
    return res.status(400).json({
      success: false,
      error: 'Missing required payload parameters (clientReportId, technicianId, clockIn.recordedAt).',
    });
  }

  // Idempotency check: If report already exists with this clientReportId, return existing report (replay safety)
  const existingReport = state.reports.find(r => r.clientReportId === clientReportId);
  if (existingReport) {
    return res.status(200).json({
      success: true,
      data: existingReport,
      meta: { message: 'Idempotent replay: Report was already synchronized.' },
    });
  }

  // Find technician
  const tech = state.users.find(u => u.id === technicianId);
  const techName = tech ? tech.fullName : 'Field Technician';
  const employeeId = tech?.employeeId || 'EMP-UNKNOWN';

  // Determine expected start time (tech custom override or system default)
  const expectedStartTime = tech?.customExpectedStartTime || state.settings.defaultExpectedStartTime || '08:00';

  // Evaluate late status using the technician's official recorded_at time!
  const { isLate, lateMinutes } = evaluateLateStatus(
    clockIn.recordedAt,
    expectedStartTime,
    state.settings.gracePeriodMinutes
  );

  const serverReceivedAt = new Date().toISOString();
  const serverSyncedAt = serverReceivedAt;

  // Determine submission type:
  // If recordedAt is more than 3 minutes before serverReceivedAt, classify as OFFLINE_SYNC
  const recordedMs = new Date(clockIn.recordedAt).getTime();
  const receivedMs = new Date(serverReceivedAt).getTime();
  const delaySeconds = Math.round((receivedMs - recordedMs) / 1000);

  const isOfflineSync = delaySeconds > 180 || req.body.isOfflineExplicit === true;
  const submissionType = isOfflineSync ? 'OFFLINE_SYNC' : 'ONLINE';

  // Check clock drift / tamper detection:
  // If rawGpsTimestamp is provided and deviates from recordedAt by > 10 minutes, flag tamper!
  let isTimeTampered = false;
  let tamperReason: string | undefined;

  if (clockIn.rawGpsTimestamp) {
    const gpsMs = new Date(clockIn.rawGpsTimestamp).getTime();
    const gpsDriftMins = Math.abs((gpsMs - recordedMs) / 60000);
    if (gpsDriftMins > 10) {
      isTimeTampered = true;
      tamperReason = `Significant GPS satellite clock discrepancy (${Math.round(gpsDriftMins)}m drift).`;
    }
  }

  const effectiveWorkDate = workDate || clockIn.recordedAt.split('T')[0];

  const newReport: DailyReport = {
    id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    clientReportId,
    technicianId,
    technicianName: techName,
    employeeId,
    workDate: effectiveWorkDate,
    status: 'SYNCED',
    submissionType,
    officialClockInTime: clockIn.recordedAt, // The sacred immutable client-recorded timestamp!
    serverReceivedAt,
    serverSyncedAt,
    expectedStartTime,
    lateStatus: isLate ? 'LATE' : 'ON_TIME',
    lateDurationMinutes: lateMinutes,
    latitude: clockIn.latitude || 37.7749,
    longitude: clockIn.longitude || -122.4194,
    locationAccuracyMeters: clockIn.accuracyMeters || 5.0,
    rawGpsTimestamp: clockIn.rawGpsTimestamp,
    deviceMonotonicUptimeMs: clockIn.deviceMonotonicUptimeMs,
    isTimeTampered,
    tamperReason,
    photos: Array.isArray(photos) ? photos : [],
    ehsAnswers: Array.isArray(ehsAnswers) ? ehsAnswers : [],
    generalComments,
    identifiedHazards,
    isOverridden: false,
    createdAt: clockIn.recordedAt,
    updatedAt: serverSyncedAt,
  };

  // Push report to state
  state.reports.unshift(newReport);

  // Add audit log
  state.auditLogs.unshift({
    id: `log-${Date.now()}`,
    actorUserId: technicianId,
    actorName: techName,
    action: isOfflineSync ? 'OFFLINE_REPORT_SYNCED' : 'ONLINE_CLOCK_IN_SUBMITTED',
    entityType: 'DAILY_REPORT',
    entityId: newReport.id,
    details: {
      clientReportId,
      officialClockIn: newReport.officialClockInTime,
      serverSynced: newReport.serverSyncedAt,
      submissionType,
      delaySeconds,
      lateStatus: newReport.lateStatus,
      isTimeTampered,
    },
    ipAddress: req.ip || '127.0.0.1',
    createdAt: serverSyncedAt,
  });

  res.status(201).json({
    success: true,
    data: newReport,
  });
});

// 8. Technician: Today's Report Status
app.get('/api/v1/reports/today', (req, res) => {
  const { technicianId } = req.query;
  const today = new Date().toISOString().split('T')[0];

  const report = state.reports.find(
    r => r.technicianId === technicianId && r.workDate === today
  );

  res.json({
    success: true,
    data: report || null,
    meta: {
      today,
      defaultExpectedStartTime: state.settings.defaultExpectedStartTime,
    },
  });
});

// 9. Admin Dashboard Summary Statistics
app.get('/api/v1/admin/dashboard/summary', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const activeTechs = state.users.filter(u => u.role === 'TECHNICIAN' && u.isActive);
  const totalTechnicians = activeTechs.length;

  const todayReports = state.reports.filter(r => r.workDate === today);
  const clockedIn = todayReports.length;
  const notClockedIn = Math.max(0, totalTechnicians - clockedIn);

  const onTime = todayReports.filter(r => r.lateStatus === 'ON_TIME' || r.lateStatus === 'EXCUSED').length;
  const late = todayReports.filter(r => r.lateStatus === 'LATE').length;
  const offlineSynced = todayReports.filter(r => r.submissionType === 'OFFLINE_SYNC').length;
  const pendingSync = todayReports.filter(r => r.status === 'PENDING_SYNC').length;
  const syncFailures = todayReports.filter(r => r.status === 'SYNC_FAILED').length;

  res.json({
    success: true,
    data: {
      totalTechnicians,
      clockedIn,
      notClockedIn,
      onTime,
      late,
      offlineSynced,
      pendingSync,
      syncFailures,
      todayDate: today,
      defaultExpectedStartTime: state.settings.defaultExpectedStartTime,
    },
  });
});

// 10. Admin Reports List (Filterable)
app.get('/api/v1/admin/reports', (req, res) => {
  const { dateFilter, technicianId, status, submissionType, search } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let filtered = [...state.reports];

  // Date Filter
  if (dateFilter === 'today') {
    filtered = filtered.filter(r => r.workDate === today);
  } else if (dateFilter === 'yesterday') {
    filtered = filtered.filter(r => r.workDate === yesterday);
  } else if (typeof dateFilter === 'string' && dateFilter.includes(',')) {
    const [start, end] = dateFilter.split(',');
    filtered = filtered.filter(r => r.workDate >= start && r.workDate <= end);
  }

  // Technician
  if (technicianId && technicianId !== 'ALL') {
    filtered = filtered.filter(r => r.technicianId === technicianId);
  }

  // Status
  if (status && status !== 'ALL') {
    if (status === 'ON_TIME' || status === 'LATE') {
      filtered = filtered.filter(r => r.lateStatus === status);
    } else {
      filtered = filtered.filter(r => r.status === status);
    }
  }

  // Submission Type
  if (submissionType && submissionType !== 'ALL') {
    filtered = filtered.filter(r => r.submissionType === submissionType);
  }

  // Search keyword (name or employee ID)
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.toLowerCase().trim();
    filtered = filtered.filter(
      r => r.technicianName.toLowerCase().includes(term) || r.employeeId.toLowerCase().includes(term)
    );
  }

  res.json({
    success: true,
    data: filtered,
    total: filtered.length,
  });
});

// 11. Admin Individual Report Details
app.get('/api/v1/admin/reports/:id', (req, res) => {
  const report = state.reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
  res.json({ success: true, data: report });
});

// 12. Admin Report Status Override
app.post('/api/v1/admin/reports/:id/override', (req, res) => {
  const { id } = req.params;
  const { newLateStatus, overrideReason, actorName } = req.body;

  const report = state.reports.find(r => r.id === id);
  if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

  if (!overrideReason || !overrideReason.trim()) {
    return res.status(400).json({ success: false, error: 'A mandatory override reason must be provided.' });
  }

  const previousStatus = report.lateStatus;
  report.lateStatus = newLateStatus || 'EXCUSED';
  report.isOverridden = true;
  report.overrideReason = overrideReason;
  report.overriddenBy = actorName || 'Rachel Hayes (Admin)';
  report.overriddenAt = new Date().toISOString();
  report.updatedAt = new Date().toISOString();

  state.auditLogs.unshift({
    id: `log-${Date.now()}`,
    actorUserId: 'usr-admin-01',
    actorName: actorName || 'Rachel Hayes',
    action: 'ADMIN_REPORT_OVERRIDE',
    entityType: 'DAILY_REPORT',
    entityId: report.id,
    details: {
      technician: report.technicianName,
      employeeId: report.employeeId,
      previousStatus,
      newStatus: report.lateStatus,
      reason: overrideReason,
    },
    ipAddress: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, data: report });
});

// 13. Data Export (CSV and XLSX formats)
app.get('/api/v1/admin/reports/export', (req, res) => {
  const { format = 'csv' } = req.query;

  const headers = [
    'Report ID',
    'Technician Name',
    'Employee ID',
    'Work Date',
    'Official Clock-In Time (Device)',
    'Server Sync Time',
    'Submission Type',
    'Expected Time',
    'Late Status',
    'Late Minutes',
    'GPS Coordinates',
    'Time Tampered Flag',
    'Photos Verified Count',
    'EHS Compliant Count',
    'General Comments',
    'Hazards Identified',
  ];

  const rows = state.reports.map(r => [
    `"${r.id}"`,
    `"${r.technicianName}"`,
    `"${r.employeeId}"`,
    `"${r.workDate}"`,
    `"${r.officialClockInTime}"`,
    `"${r.serverSyncedAt}"`,
    `"${r.submissionType}"`,
    `"${r.expectedStartTime}"`,
    `"${r.lateStatus}"`,
    r.lateDurationMinutes,
    `"${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}"`,
    r.isTimeTampered ? 'YES - FLAGGED' : 'NO',
    r.photos.length,
    r.ehsAnswers.filter(a => a.isCompliant).length,
    `"${(r.generalComments || '').replace(/"/g, '""')}"`,
    `"${(r.identifiedHazards || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  // Log export action in audit log
  state.auditLogs.unshift({
    id: `log-${Date.now()}`,
    actorUserId: 'usr-admin-01',
    actorName: 'Rachel Hayes',
    action: 'REPORTS_EXPORTED',
    entityType: 'REPORTS',
    entityId: 'ALL',
    details: { recordCount: state.reports.length, format },
    ipAddress: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=fieldpulse_reports_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csvContent);
});

// 14. System Settings
app.get('/api/v1/admin/settings', (req, res) => {
  res.json({ success: true, data: state.settings });
});

app.put('/api/v1/admin/settings', (req, res) => {
  const { defaultExpectedStartTime, gracePeriodMinutes, maxOfflineRetentionDays, enforceGeofence } = req.body;
  if (defaultExpectedStartTime) state.settings.defaultExpectedStartTime = defaultExpectedStartTime;
  if (typeof gracePeriodMinutes === 'number') state.settings.gracePeriodMinutes = gracePeriodMinutes;
  if (typeof maxOfflineRetentionDays === 'number') state.settings.maxOfflineRetentionDays = maxOfflineRetentionDays;
  if (typeof enforceGeofence === 'boolean') state.settings.enforceGeofence = enforceGeofence;
  state.settings.updatedAt = new Date().toISOString();

  state.auditLogs.unshift({
    id: `log-${Date.now()}`,
    actorUserId: 'usr-admin-01',
    actorName: 'Rachel Hayes',
    action: 'SETTINGS_UPDATED',
    entityType: 'SYSTEM_SETTINGS',
    entityId: 'config-1',
    details: req.body,
    ipAddress: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, data: state.settings });
});

// 15. Audit Logs List
app.get('/api/v1/admin/audit-logs', (req, res) => {
  res.json({ success: true, data: state.auditLogs });
});

// 16. Reset Demo
app.post('/api/v1/system/reset-demo', (req, res) => {
  seedInitialData();
  res.json({ success: true, message: 'Demo system state restored to clean initial fixtures.' });
});

// PWA Manifest & App Identity Routes (with open CORS for PWABuilder and external validators)
app.get(['/manifest.json', '/manifest.webmanifest', '/site.webmanifest'], (req, res) => {
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(manifestPath);
});

app.get(['/pwa-192x192.png', '/pwa-512x512.png', '/pwa-maskable-512x512.png', '/apple-touch-icon.png', '/icon.svg', '/favicon.ico'], (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const filePath = path.join(process.cwd(), 'public', req.path);
  res.sendFile(filePath, (err) => {
    if (err) next();
  });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FieldPulse Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
