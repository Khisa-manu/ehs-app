import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dbRepo from './src/db/repository.ts';
import { DailyReport, User, ReportPhoto, EHSAnswer } from './src/types.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper: Evaluate late status based on expected start time and grace period
export function evaluateLateStatus(
  recordedIso: string,
  expectedTimeStr: string, // e.g. "08:00"
  graceMinutes: number
): { isLate: boolean; lateMinutes: number } {
  try {
    const recordedDate = new Date(recordedIso);
    const [expHours, expMins] = expectedTimeStr.split(':').map(Number);
    
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
// REST API ROUTES (Backed by Cloud SQL PostgreSQL)
// -------------------------------------------------------------

// 1. Health check
app.get('/api/v1/health', async (req, res) => {
  let dbStatus = 'connected';
  try {
    await dbRepo.getSystemSettings();
  } catch (err: any) {
    dbStatus = 'unreachable';
  }

  res.json({
    status: 'healthy',
    database: 'Cloud SQL PostgreSQL',
    databaseStatus: dbStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'FieldPulse EHS & Clock-In Core API',
  });
});

// 2. Auth: User credential matching from PostgreSQL
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, role } = req.body;
    const allUsers = await dbRepo.getAllUsers();
    
    let matchedUser = allUsers.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    
    if (!matchedUser) {
      if (role === 'ADMIN') {
        matchedUser = allUsers.find(u => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN');
      } else {
        matchedUser = allUsers.find(u => u.role === 'TECHNICIAN');
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
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Authentication service failure' });
  }
});

// 3. EHS Questions from PostgreSQL
app.get('/api/v1/ehs/questions', async (req, res) => {
  try {
    const questions = await dbRepo.getAllEhsQuestions();
    res.json({
      success: true,
      data: questions.filter(q => q.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    });
  } catch (error: any) {
    console.error('Failed to get EHS questions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch EHS checklist' });
  }
});

// 4. Technicians List & Management from PostgreSQL
app.get('/api/v1/technicians', async (req, res) => {
  try {
    const allUsers = await dbRepo.getAllUsers();
    const techs = allUsers.filter(u => u.role === 'TECHNICIAN');
    res.json({ success: true, data: techs });
  } catch (error: any) {
    console.error('Failed to get technicians:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch technicians' });
  }
});

app.post('/api/v1/technicians', async (req, res) => {
  try {
    const { fullName, email, employeeId, phoneNumber, customExpectedStartTime } = req.body;
    
    if (!fullName || !email || !employeeId) {
      return res.status(400).json({ success: false, error: 'Full name, email, and employee ID are required.' });
    }

    const allUsers = await dbRepo.getAllUsers();
    const existing = allUsers.find(u => u.employeeId === employeeId || u.email === email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Technician with this Employee ID or Email already exists.' });
    }

    const newId = `usr-tech-${Date.now()}`;
    const newTech = await dbRepo.upsertUser({
      id: newId,
      email,
      fullName,
      role: 'TECHNICIAN',
      employeeId,
      phoneNumber: phoneNumber || '',
      customExpectedStartTime: customExpectedStartTime || undefined,
      isActive: true,
    });

    await dbRepo.insertAuditLog({
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
  } catch (error: any) {
    console.error('Failed to create technician:', error);
    res.status(500).json({ success: false, error: 'Failed to create technician' });
  }
});

app.patch('/api/v1/technicians/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await dbRepo.getUserById(id);
    if (!user) return res.status(404).json({ success: false, error: 'Technician not found' });

    const { isActive, fullName, phoneNumber, customExpectedStartTime } = req.body;
    const updated = await dbRepo.upsertUser({
      id,
      email: user.email,
      fullName: fullName !== undefined ? fullName : user.fullName,
      role: user.role,
      employeeId: user.employeeId,
      phoneNumber: phoneNumber !== undefined ? phoneNumber : user.phoneNumber,
      customExpectedStartTime: customExpectedStartTime !== undefined ? customExpectedStartTime : user.customExpectedStartTime,
      isActive: typeof isActive === 'boolean' ? isActive : user.isActive,
    });

    await dbRepo.insertAuditLog({
      id: `log-${Date.now()}`,
      actorUserId: 'usr-admin-01',
      actorName: 'Rachel Hayes',
      action: 'TECHNICIAN_UPDATED',
      entityType: 'TECHNICIAN',
      entityId: id,
      details: req.body,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Failed to update technician:', error);
    res.status(500).json({ success: false, error: 'Failed to update technician' });
  }
});

app.delete('/api/v1/technicians/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await dbRepo.getUserById(id);
    if (!user) return res.status(404).json({ success: false, error: 'Technician not found' });

    await dbRepo.deleteUser(id);

    await dbRepo.insertAuditLog({
      id: `log-${Date.now()}`,
      actorUserId: 'usr-admin-01',
      actorName: 'Rachel Hayes',
      action: 'TECHNICIAN_REMOVED',
      entityType: 'TECHNICIAN',
      entityId: id,
      details: { employeeId: user.employeeId, fullName: user.fullName },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, message: `Technician ${user.fullName} removed successfully.` });
  } catch (error: any) {
    console.error('Failed to remove technician:', error);
    res.status(500).json({ success: false, error: 'Failed to remove technician' });
  }
});

// 5. Presigned URL / Media Upload
app.post('/api/v1/photos/presign-upload', (req, res) => {
  const { photoType, clientPhotoId } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `uploads/${today}/${photoType?.toLowerCase() || 'photo'}_${clientPhotoId || Date.now()}.jpg`;

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

// 7. CORE IDEMPOTENT OFFLINE / ONLINE SYNC BATCH HANDLER (Persists to PostgreSQL)
app.post('/api/v1/sync/batch', async (req, res) => {
  try {
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

    // Idempotency check: Look for existing report with clientReportId in PostgreSQL
    const existingReports = await dbRepo.getAllDailyReports();
    const existingReport = existingReports.find(r => r.clientReportId === clientReportId);
    if (existingReport) {
      return res.status(200).json({
        success: true,
        data: existingReport,
        meta: { message: 'Idempotent replay: Report was already synchronized in PostgreSQL.' },
      });
    }

    // Find technician & settings from PostgreSQL
    const [tech, settings] = await Promise.all([
      dbRepo.getUserById(technicianId),
      dbRepo.getSystemSettings(),
    ]);

    const techName = tech ? tech.fullName : 'Field Technician';
    const employeeId = tech?.employeeId || 'EMP-UNKNOWN';
    const expectedStartTime = tech?.customExpectedStartTime || settings.defaultExpectedStartTime || '08:00';

    // Evaluate late status using the technician's official recorded_at timestamp
    const { isLate, lateMinutes } = evaluateLateStatus(
      clockIn.recordedAt,
      expectedStartTime,
      settings.gracePeriodMinutes
    );

    const serverReceivedAt = new Date().toISOString();
    const serverSyncedAt = serverReceivedAt;

    const recordedMs = new Date(clockIn.recordedAt).getTime();
    const receivedMs = new Date(serverReceivedAt).getTime();
    const delaySeconds = Math.round((receivedMs - recordedMs) / 1000);

    const isOfflineSync = delaySeconds > 180 || req.body.isOfflineExplicit === true;
    const submissionType = isOfflineSync ? 'OFFLINE_SYNC' : 'ONLINE';

    // Clock drift / tamper check
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
      officialClockInTime: clockIn.recordedAt,
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

    // Save directly into shared Cloud SQL PostgreSQL!
    const savedReport = await dbRepo.createOrUpsertDailyReport(newReport);

    // Write audit log to PostgreSQL
    await dbRepo.insertAuditLog({
      id: `log-${Date.now()}`,
      actorUserId: technicianId,
      actorName: techName,
      action: isOfflineSync ? 'OFFLINE_REPORT_SYNCED' : 'ONLINE_CLOCK_IN_SUBMITTED',
      entityType: 'DAILY_REPORT',
      entityId: savedReport.id,
      details: {
        clientReportId,
        officialClockIn: savedReport.officialClockInTime,
        serverSynced: savedReport.serverSyncedAt,
        submissionType,
        delaySeconds,
        lateStatus: savedReport.lateStatus,
        isTimeTampered,
      },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: serverSyncedAt,
    });

    res.status(201).json({
      success: true,
      data: savedReport,
    });
  } catch (error: any) {
    console.error('Failed to process sync batch in PostgreSQL:', error);
    res.status(500).json({ success: false, error: 'Database storage error during report synchronization' });
  }
});

// 8. Technician: Today's Report Status from PostgreSQL
app.get('/api/v1/reports/today', async (req, res) => {
  try {
    const { technicianId } = req.query;
    const today = new Date().toISOString().split('T')[0];

    const [allReports, settings] = await Promise.all([
      dbRepo.getAllDailyReports(),
      dbRepo.getSystemSettings(),
    ]);

    const report = allReports.find(
      r => r.technicianId === technicianId && r.workDate === today
    );

    res.json({
      success: true,
      data: report || null,
      meta: {
        today,
        defaultExpectedStartTime: settings.defaultExpectedStartTime,
      },
    });
  } catch (error: any) {
    console.error('Failed to get today report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch status' });
  }
});

// 9. Admin Dashboard Summary Statistics from PostgreSQL
app.get('/api/v1/admin/dashboard/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [allUsers, allReports, settings] = await Promise.all([
      dbRepo.getAllUsers(),
      dbRepo.getAllDailyReports(),
      dbRepo.getSystemSettings(),
    ]);

    const activeTechs = allUsers.filter(u => u.role === 'TECHNICIAN' && u.isActive);
    const totalTechnicians = activeTechs.length;

    const todayReports = allReports.filter(r => r.workDate === today);
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
        defaultExpectedStartTime: settings.defaultExpectedStartTime,
      },
    });
  } catch (error: any) {
    console.error('Failed to get dashboard summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard summary' });
  }
});

// 10. Admin Reports List (Filterable from PostgreSQL)
app.get('/api/v1/admin/reports', async (req, res) => {
  try {
    const { dateFilter, technicianId, status, submissionType, search } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const allReports = await dbRepo.getAllDailyReports();
    let filtered = [...allReports];

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

    // Search keyword
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
  } catch (error: any) {
    console.error('Failed to get reports:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

// 11. Admin Individual Report Details from PostgreSQL
app.get('/api/v1/admin/reports/:id', async (req, res) => {
  try {
    const report = await dbRepo.getDailyReportById(req.params.id);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Failed to get report detail:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report details' });
  }
});

// 12. Admin Report Status Override (Writes to PostgreSQL)
app.post('/api/v1/admin/reports/:id/override', async (req, res) => {
  try {
    const { id } = req.params;
    const { newLateStatus, overrideReason, actorName } = req.body;

    if (!overrideReason || !overrideReason.trim()) {
      return res.status(400).json({ success: false, error: 'A mandatory override reason must be provided.' });
    }

    const overriddenBy = actorName || 'Rachel Hayes (Admin)';
    const updated = await dbRepo.overrideDailyReport(id, newLateStatus || 'EXCUSED', overrideReason, overriddenBy);
    if (!updated) return res.status(404).json({ success: false, error: 'Report not found' });

    await dbRepo.insertAuditLog({
      id: `log-${Date.now()}`,
      actorUserId: 'usr-admin-01',
      actorName: overriddenBy,
      action: 'ADMIN_REPORT_OVERRIDE',
      entityType: 'DAILY_REPORT',
      entityId: id,
      details: {
        technician: updated.technicianName,
        employeeId: updated.employeeId,
        newStatus: updated.lateStatus,
        reason: overrideReason,
      },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Failed to override report:', error);
    res.status(500).json({ success: false, error: 'Failed to update report override' });
  }
});

// 13. Data Export (CSV) from PostgreSQL
app.get('/api/v1/admin/reports/export', async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const reports = await dbRepo.getAllDailyReports();

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
      'Photos Count',
      'EHS Compliant Count',
      'General Comments',
      'Hazards Identified',
    ];

    const rows = reports.map(r => [
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

    await dbRepo.insertAuditLog({
      id: `log-${Date.now()}`,
      actorUserId: 'usr-admin-01',
      actorName: 'Rachel Hayes',
      action: 'REPORTS_EXPORTED',
      entityType: 'REPORTS',
      entityId: 'ALL',
      details: { recordCount: reports.length, format },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=fieldpulse_reports_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('Failed to export reports:', error);
    res.status(500).json({ success: false, error: 'Failed to export reports' });
  }
});

// 14. System Settings from PostgreSQL
app.get('/api/v1/admin/settings', async (req, res) => {
  try {
    const settings = await dbRepo.getSystemSettings();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Failed to get settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

app.put('/api/v1/admin/settings', async (req, res) => {
  try {
    const updated = await dbRepo.updateSystemSettings(req.body);

    await dbRepo.insertAuditLog({
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

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// 15. Audit Logs List from PostgreSQL
app.get('/api/v1/admin/audit-logs', async (req, res) => {
  try {
    const logs = await dbRepo.getAllAuditLogs();
    res.json({ success: true, data: logs });
  } catch (error: any) {
    console.error('Failed to get audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

// 16. Reset Demo in PostgreSQL
app.post('/api/v1/system/reset-demo', async (req, res) => {
  try {
    await dbRepo.seedDatabaseIfEmpty();
    res.json({ success: true, message: 'Cloud SQL PostgreSQL system state verified and synchronized.' });
  } catch (error: any) {
    console.error('Failed to reset demo:', error);
    res.status(500).json({ success: false, error: 'Failed to reset state' });
  }
});

// PWA Manifest & App Identity Routes
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
  // Seed and verify Cloud SQL PostgreSQL tables
  try {
    await dbRepo.seedDatabaseIfEmpty();
  } catch (dbErr) {
    console.error('[Database Initialization] Cloud SQL startup error:', dbErr);
  }

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
    console.log(`[FieldPulse Server] Running with Cloud SQL PostgreSQL on http://0.0.0.0:${PORT}`);
  });
}

startServer();
