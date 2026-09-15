import { db } from './index.ts';
import { users, dailyReports, ehsQuestions, systemSettings, auditLogs } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { DailyReport, User, SystemSettings, AuditLog, EHSQuestion, ReportPhoto, EHSAnswer } from '../types.ts';

// Helper to convert DB record to DailyReport domain model
function mapDbReportToDailyReport(row: typeof dailyReports.$inferSelect): DailyReport {
  let photos: ReportPhoto[] = [];
  try {
    photos = JSON.parse(row.photosJson || '[]');
  } catch (e) {
    photos = [];
  }

  let ehsAnswers: EHSAnswer[] = [];
  try {
    ehsAnswers = JSON.parse(row.ehsAnswersJson || '[]');
  } catch (e) {
    ehsAnswers = [];
  }

  return {
    id: row.id,
    clientReportId: row.clientReportId,
    technicianId: row.technicianId,
    technicianName: row.technicianName,
    employeeId: row.employeeId,
    workDate: row.workDate,
    status: row.status as any,
    submissionType: row.submissionType as any,
    officialClockInTime: row.officialClockInTime,
    serverReceivedAt: row.serverReceivedAt,
    serverSyncedAt: row.serverSyncedAt,
    expectedStartTime: row.expectedStartTime,
    lateStatus: row.lateStatus as any,
    lateDurationMinutes: row.lateDurationMinutes,
    latitude: row.latitude,
    longitude: row.longitude,
    locationAccuracyMeters: row.locationAccuracyMeters,
    rawGpsTimestamp: row.rawGpsTimestamp || undefined,
    deviceMonotonicUptimeMs: row.deviceMonotonicUptimeMs || undefined,
    isTimeTampered: row.isTimeTampered,
    tamperReason: row.tamperReason || undefined,
    photos,
    ehsAnswers,
    generalComments: row.generalComments || undefined,
    identifiedHazards: row.identifiedHazards || undefined,
    isOverridden: row.isOverridden,
    overrideReason: row.overrideReason || undefined,
    overriddenBy: row.overriddenBy || undefined,
    overriddenAt: row.overriddenAt || undefined,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// 1. Users Queries
export async function getAllUsers(): Promise<User[]> {
  try {
    const rows = await db.select().from(users).orderBy(users.fullName);
    return rows.map(r => ({
      id: r.id,
      email: r.email,
      fullName: r.fullName,
      role: r.role as any,
      employeeId: r.employeeId || undefined,
      phoneNumber: r.phoneNumber || undefined,
      customExpectedStartTime: r.customExpectedStartTime || undefined,
      isActive: r.isActive,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Database query failed in getAllUsers:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      email: r.email,
      fullName: r.fullName,
      role: r.role as any,
      employeeId: r.employeeId || undefined,
      phoneNumber: r.phoneNumber || undefined,
      customExpectedStartTime: r.customExpectedStartTime || undefined,
      isActive: r.isActive,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database query failed in getUserById:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function upsertUser(data: {
  id: string;
  email: string;
  fullName: string;
  role?: string;
  employeeId?: string;
  phoneNumber?: string;
  customExpectedStartTime?: string;
  isActive?: boolean;
}): Promise<User> {
  try {
    const rows = await db.insert(users)
      .values({
        id: data.id,
        uid: data.id,
        email: data.email,
        fullName: data.fullName,
        role: data.role || 'TECHNICIAN',
        employeeId: data.employeeId || null,
        phoneNumber: data.phoneNumber || null,
        customExpectedStartTime: data.customExpectedStartTime || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          fullName: data.fullName,
          email: data.email,
          role: data.role || 'TECHNICIAN',
          employeeId: data.employeeId || null,
          phoneNumber: data.phoneNumber || null,
          customExpectedStartTime: data.customExpectedStartTime || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
        }
      })
      .returning();

    const r = rows[0];
    return {
      id: r.id,
      email: r.email,
      fullName: r.fullName,
      role: r.role as any,
      employeeId: r.employeeId || undefined,
      phoneNumber: r.phoneNumber || undefined,
      customExpectedStartTime: r.customExpectedStartTime || undefined,
      isActive: r.isActive,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database query failed in upsertUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await db.delete(users).where(eq(users.id, id));
    return true;
  } catch (error) {
    console.error('Database query failed in deleteUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// 2. Settings Queries
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const rows = await db.select().from(systemSettings).where(eq(systemSettings.id, 1)).limit(1);
    if (rows.length === 0) {
      // Default
      return {
        id: 1,
        defaultExpectedStartTime: '08:00',
        gracePeriodMinutes: 5,
        maxOfflineRetentionDays: 14,
        enforceGeofence: false,
        updatedAt: new Date().toISOString(),
      };
    }
    const r = rows[0];
    return {
      id: r.id,
      defaultExpectedStartTime: r.defaultExpectedStartTime,
      gracePeriodMinutes: r.gracePeriodMinutes,
      maxOfflineRetentionDays: r.maxOfflineRetentionDays,
      enforceGeofence: r.enforceGeofence,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database query failed in getSystemSettings:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
  try {
    const rows = await db.insert(systemSettings)
      .values({
        id: 1,
        defaultExpectedStartTime: data.defaultExpectedStartTime || '08:00',
        gracePeriodMinutes: data.gracePeriodMinutes !== undefined ? data.gracePeriodMinutes : 5,
        maxOfflineRetentionDays: data.maxOfflineRetentionDays !== undefined ? data.maxOfflineRetentionDays : 14,
        enforceGeofence: data.enforceGeofence !== undefined ? data.enforceGeofence : false,
      })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: {
          defaultExpectedStartTime: data.defaultExpectedStartTime !== undefined ? data.defaultExpectedStartTime : undefined,
          gracePeriodMinutes: data.gracePeriodMinutes !== undefined ? data.gracePeriodMinutes : undefined,
          maxOfflineRetentionDays: data.maxOfflineRetentionDays !== undefined ? data.maxOfflineRetentionDays : undefined,
          enforceGeofence: data.enforceGeofence !== undefined ? data.enforceGeofence : undefined,
          updatedAt: new Date(),
        }
      })
      .returning();

    const r = rows[0];
    return {
      id: r.id,
      defaultExpectedStartTime: r.defaultExpectedStartTime,
      gracePeriodMinutes: r.gracePeriodMinutes,
      maxOfflineRetentionDays: r.maxOfflineRetentionDays,
      enforceGeofence: r.enforceGeofence,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database query failed in updateSystemSettings:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// 3. EHS Questions Queries
export async function getAllEhsQuestions(): Promise<EHSQuestion[]> {
  try {
    const rows = await db.select().from(ehsQuestions).orderBy(ehsQuestions.displayOrder);
    return rows.map(r => ({
      id: r.id,
      code: r.code,
      category: r.category,
      questionText: r.questionText,
      guidanceNotes: r.guidanceNotes,
      isMandatory: r.isMandatory,
      displayOrder: r.displayOrder,
      isActive: r.isActive,
    }));
  } catch (error) {
    console.error('Database query failed in getAllEhsQuestions:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// 4. Daily Reports Queries (Shared real-time PostgreSQL storage)
export async function getAllDailyReports(): Promise<DailyReport[]> {
  try {
    const rows = await db.select().from(dailyReports).orderBy(desc(dailyReports.createdAt));
    return rows.map(mapDbReportToDailyReport);
  } catch (error) {
    console.error('Database query failed in getAllDailyReports:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getDailyReportById(id: string): Promise<DailyReport | null> {
  try {
    const rows = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);
    if (rows.length === 0) return null;
    return mapDbReportToDailyReport(rows[0]);
  } catch (error) {
    console.error('Database query failed in getDailyReportById:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createOrUpsertDailyReport(report: DailyReport): Promise<DailyReport> {
  try {
    // Ensure technician exists in users table first
    const existingUser = await db.select().from(users).where(eq(users.id, report.technicianId)).limit(1);
    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: report.technicianId,
        uid: report.technicianId,
        email: `${report.employeeId.toLowerCase()}@fieldpulse.com`,
        fullName: report.technicianName,
        role: 'TECHNICIAN',
        employeeId: report.employeeId,
      }).onConflictDoNothing();
    }

    const rows = await db.insert(dailyReports)
      .values({
        id: report.id,
        clientReportId: report.clientReportId,
        technicianId: report.technicianId,
        technicianName: report.technicianName,
        employeeId: report.employeeId,
        workDate: report.workDate,
        status: report.status,
        submissionType: report.submissionType,
        officialClockInTime: report.officialClockInTime,
        serverReceivedAt: report.serverReceivedAt,
        serverSyncedAt: report.serverSyncedAt,
        expectedStartTime: report.expectedStartTime,
        lateStatus: report.lateStatus,
        lateDurationMinutes: report.lateDurationMinutes,
        latitude: report.latitude,
        longitude: report.longitude,
        locationAccuracyMeters: report.locationAccuracyMeters,
        rawGpsTimestamp: report.rawGpsTimestamp || null,
        deviceMonotonicUptimeMs: report.deviceMonotonicUptimeMs || null,
        isTimeTampered: report.isTimeTampered,
        tamperReason: report.tamperReason || null,
        photosJson: JSON.stringify(report.photos || []),
        ehsAnswersJson: JSON.stringify(report.ehsAnswers || []),
        generalComments: report.generalComments || null,
        identifiedHazards: report.identifiedHazards || null,
        isOverridden: report.isOverridden,
        overrideReason: report.overrideReason || null,
        overriddenBy: report.overriddenBy || null,
        overriddenAt: report.overriddenAt || null,
      })
      .onConflictDoUpdate({
        target: dailyReports.clientReportId,
        set: {
          status: report.status,
          serverSyncedAt: report.serverSyncedAt,
          lateStatus: report.lateStatus,
          lateDurationMinutes: report.lateDurationMinutes,
          isOverridden: report.isOverridden,
          overrideReason: report.overrideReason || null,
          overriddenBy: report.overriddenBy || null,
          overriddenAt: report.overriddenAt || null,
          updatedAt: new Date(),
        }
      })
      .returning();

    return mapDbReportToDailyReport(rows[0]);
  } catch (error) {
    console.error('Database query failed in createOrUpsertDailyReport:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function overrideDailyReport(
  reportId: string,
  newStatus: 'ON_TIME' | 'LATE' | 'EXCUSED',
  reason: string,
  overriddenBy: string
): Promise<DailyReport | null> {
  try {
    const nowIso = new Date().toISOString();
    const rows = await db.update(dailyReports)
      .set({
        lateStatus: newStatus,
        isOverridden: true,
        overrideReason: reason,
        overriddenBy,
        overriddenAt: nowIso,
        updatedAt: new Date(),
      })
      .where(eq(dailyReports.id, reportId))
      .returning();

    if (rows.length === 0) return null;
    return mapDbReportToDailyReport(rows[0]);
  } catch (error) {
    console.error('Database query failed in overrideDailyReport:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// 5. Audit Logs Queries
export async function getAllAuditLogs(): Promise<AuditLog[]> {
  try {
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    return rows.map(r => {
      let details: Record<string, any> = {};
      try {
        details = JSON.parse(r.detailsJson || '{}');
      } catch (e) {
        details = {};
      }
      return {
        id: r.id,
        actorUserId: r.actorUserId,
        actorName: r.actorName,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        details,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('Database query failed in getAllAuditLogs:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertAuditLog(log: AuditLog): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: log.id,
      actorUserId: log.actorUserId,
      actorName: log.actorName,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      detailsJson: JSON.stringify(log.details || {}),
      ipAddress: log.ipAddress || '127.0.0.1',
    });
  } catch (error) {
    console.error('Database query failed in insertAuditLog:', error);
    // Non-blocking log insert error
  }
}

// 6. Database Initialization & Seed
export async function seedDatabaseIfEmpty(): Promise<void> {
  try {
    // 1. Check settings
    const existingSettings = await db.select().from(systemSettings).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(systemSettings).values({
        id: 1,
        defaultExpectedStartTime: '08:00',
        gracePeriodMinutes: 5,
        maxOfflineRetentionDays: 14,
        enforceGeofence: false,
      }).onConflictDoNothing();
    }

    // 2. Check users
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      await db.insert(users).values([
        {
          id: 'usr-tech-01',
          uid: 'usr-tech-01',
          email: 'carlos.mendez@fieldpulse.com',
          fullName: 'Carlos Mendez',
          role: 'TECHNICIAN',
          employeeId: 'EMP-1042',
          phoneNumber: '(415) 892-4410',
          isActive: true,
        },
        {
          id: 'usr-tech-02',
          uid: 'usr-tech-02',
          email: 'sarah.jenkins@fieldpulse.com',
          fullName: 'Sarah Jenkins',
          role: 'TECHNICIAN',
          employeeId: 'EMP-1088',
          phoneNumber: '(415) 773-1992',
          isActive: true,
        },
        {
          id: 'usr-tech-03',
          uid: 'usr-tech-03',
          email: 'marcus.thorne@fieldpulse.com',
          fullName: 'Marcus Thorne',
          role: 'TECHNICIAN',
          employeeId: 'EMP-1105',
          phoneNumber: '(510) 334-8022',
          isActive: true,
        },
        {
          id: 'usr-tech-04',
          uid: 'usr-tech-04',
          email: 'elena.rostova@fieldpulse.com',
          fullName: 'Elena Rostova',
          role: 'TECHNICIAN',
          employeeId: 'EMP-1140',
          phoneNumber: '(650) 419-7621',
          isActive: true,
        },
        {
          id: 'usr-tech-05',
          uid: 'usr-tech-05',
          email: 'david.kim@fieldpulse.com',
          fullName: 'David Kim',
          role: 'TECHNICIAN',
          employeeId: 'EMP-1201',
          phoneNumber: '(408) 552-9011',
          isActive: true,
        },
        {
          id: 'usr-admin-01',
          uid: 'usr-admin-01',
          email: 'rachel.hayes@fieldpulse.com',
          fullName: 'Rachel Hayes',
          role: 'SUPER_ADMIN',
          phoneNumber: '(415) 555-0199',
          isActive: true,
        },
      ]).onConflictDoNothing();
    }

    // 3. Check EHS questions
    const existingQuestions = await db.select().from(ehsQuestions).limit(1);
    if (existingQuestions.length === 0) {
      await db.insert(ehsQuestions).values([
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
      ]).onConflictDoNothing();
    }

    // 4. Check daily reports - seed initial realistic reports so dashboard has live data
    const existingReports = await db.select().from(dailyReports).limit(1);
    if (existingReports.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      await db.insert(dailyReports).values([
        {
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
          photosJson: JSON.stringify([
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
          ]),
          ehsAnswersJson: JSON.stringify([
            { questionId: 'ehs-q1', isCompliant: true },
            { questionId: 'ehs-q2', isCompliant: true },
            { questionId: 'ehs-q3', isCompliant: true },
            { questionId: 'ehs-q4', isCompliant: true },
            { questionId: 'ehs-q5', isCompliant: true },
          ]),
          generalComments: 'Arrived at sub-station beta on schedule. Radio check completed with dispatch.',
        },
        {
          id: 'rep-seed-02',
          clientReportId: 'd8312019-91a1-4322-8bf1-ffc728101a99',
          technicianId: 'usr-tech-02',
          technicianName: 'Sarah Jenkins',
          employeeId: 'EMP-1088',
          workDate: today,
          status: 'SYNCED',
          submissionType: 'ONLINE',
          officialClockInTime: `${today}T08:18:40.000Z`,
          serverReceivedAt: `${today}T08:18:40.000Z`,
          serverSyncedAt: `${today}T08:18:40.000Z`,
          expectedStartTime: '08:00',
          lateStatus: 'LATE',
          lateDurationMinutes: 18,
          latitude: 37.783333,
          longitude: -122.416667,
          locationAccuracyMeters: 6.2,
          rawGpsTimestamp: `${today}T08:18:39.000Z`,
          deviceMonotonicUptimeMs: 198210332,
          isTimeTampered: false,
          photosJson: JSON.stringify([]),
          ehsAnswersJson: JSON.stringify([
            { questionId: 'ehs-q1', isCompliant: true },
            { questionId: 'ehs-q2', isCompliant: true },
            { questionId: 'ehs-q3', isCompliant: true },
            { questionId: 'ehs-q4', isCompliant: true },
            { questionId: 'ehs-q5', isCompliant: true },
          ]),
          generalComments: 'Major freeway bottleneck on US-101 northbound.',
        }
      ]).onConflictDoNothing();
    }
    console.log('PostgreSQL database check and seed complete.');
  } catch (error) {
    console.error('Error seeding PostgreSQL database:', error);
  }
}
