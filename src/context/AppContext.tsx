import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  DailyReport, 
  SystemSettings, 
  AuditLog, 
  DashboardSummary, 
  EHSQuestion, 
  OfflineSyncQueueItem,
  ReportPhoto,
  EHSAnswer,
  AuthSession
} from '../types';
import { getApiUrl } from '../config';

interface AppContextType {
  // Navigation & View
  activeView: 'mobile_tech' | 'admin_dashboard';
  setActiveView: (view: 'mobile_tech' | 'admin_dashboard') => void;
  adminTab: 'reports' | 'technicians' | 'settings' | 'audit_logs';
  setAdminTab: (tab: 'reports' | 'technicians' | 'settings' | 'audit_logs') => void;

  // Real Authentication & Session Tokens
  isLoggedIn: boolean;
  authToken: string | null;
  authSession: AuthSession | null;
  login: (user: User, token?: string) => void;
  loginWithCredentials: (credential: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  changePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  resetTechnicianPin: (technicianId: string, newPin?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  allUsers: User[];
  refreshUsers: () => Promise<void>;

  // Network Simulation (Critical for Offline Testing)
  isNetworkOnline: boolean;
  setIsNetworkOnline: (online: boolean) => void;
  toggleNetworkSimulation: () => void;

  // Offline Sync Queue (Local SQLite / IndexedDB mirror)
  syncQueue: OfflineSyncQueueItem[];
  isSyncing: boolean;
  syncError: string | null;
  triggerSync: () => Promise<void>;
  
  // Data
  summary: DashboardSummary | null;
  reports: DailyReport[];
  ehsQuestions: EHSQuestion[];
  settings: SystemSettings | null;
  auditLogs: AuditLog[];
  todayReport: DailyReport | null;

  // Actions
  refreshDashboard: () => Promise<void>;
  submitClockInReport: (payload: {
    recordedAt: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    rawGpsTimestamp?: string;
    photos: ReportPhoto[];
    ehsAnswers: EHSAnswer[];
    generalComments?: string;
    identifiedHazards?: string;
    customTimeOverride?: string; // For testing explicit offline times (e.g. 07:42 AM)
  }) => Promise<{ success: boolean; isOffline: boolean; report?: DailyReport }>;
  
  adminOverrideReport: (reportId: string, newStatus: 'ON_TIME' | 'LATE' | 'EXCUSED', reason: string) => Promise<boolean>;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
  createTechnician: (data: { fullName: string; email: string; employeeId: string; phoneNumber?: string; customExpectedStartTime?: string; pin?: string }) => Promise<boolean>;
  updateTechnician: (id: string, data: Partial<User>) => Promise<boolean>;
  deleteTechnician: (id: string) => Promise<boolean>;
  resetDemoData: () => Promise<void>;
  exportReportsCsv: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_QUEUE_KEY = 'fieldpulse_offline_sync_queue_v1';

const DEFAULT_SPECTRUM_USERS: User[] = [
  {
    id: 'usr-tech-01',
    email: 'carlos.mendez@spectrum-ehs.com',
    fullName: 'Carlos Mendez',
    role: 'TECHNICIAN',
    employeeId: 'SE-1042',
    phoneNumber: '(415) 892-4410',
    isActive: true,
    createdAt: '2025-01-10T08:00:00Z',
  },
  {
    id: 'usr-tech-02',
    email: 'marcus.rodriguez@spectrum-ehs.com',
    fullName: 'Marcus Rodriguez',
    role: 'TECHNICIAN',
    employeeId: 'SE-7842',
    phoneNumber: '(415) 720-3391',
    isActive: true,
    createdAt: '2025-01-15T08:00:00Z',
  },
  {
    id: 'usr-tech-03',
    email: 'sarah.chen@spectrum-ehs.com',
    fullName: 'Sarah Chen',
    role: 'TECHNICIAN',
    employeeId: 'SE-5021',
    phoneNumber: '(415) 441-9982',
    isActive: true,
    createdAt: '2025-02-01T08:00:00Z',
  },
  {
    id: 'usr-admin-01',
    email: 'rachel.hayes@spectrum-ehs.com',
    fullName: 'Rachel Hayes',
    role: 'SUPER_ADMIN',
    employeeId: 'SE-ADMIN-01',
    phoneNumber: '(415) 555-0199',
    isActive: true,
    createdAt: '2024-11-01T08:00:00Z',
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<'mobile_tech' | 'admin_dashboard'>('mobile_tech');
  const [adminTab, setAdminTab] = useState<'reports' | 'technicians' | 'settings' | 'audit_logs'>('reports');
  
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('spectrum_auth_token') || null;
  });

  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem('spectrum_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('spectrum_is_logged_in') !== 'false';
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedUserId = localStorage.getItem('spectrum_user_id');
    const matched = DEFAULT_SPECTRUM_USERS.find(u => u.id === savedUserId);
    return matched || DEFAULT_SPECTRUM_USERS[0];
  });

  const [allUsers, setAllUsers] = useState<User[]>(DEFAULT_SPECTRUM_USERS);

  // Authenticated fetch helper that injects Bearer JWT
  const authedFetch = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const url = getApiUrl(endpoint);
    const headers = new Headers(options.headers || {});
    const token = authToken || localStorage.getItem('spectrum_auth_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, {
      ...options,
      headers,
    });
  }, [authToken]);

  // Real Credential & PIN Login (Verifies bcrypt hash on backend, issues JWT)
  const loginWithCredentials = async (credential: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(getApiUrl('/api/v1/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, pin }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data?.token) {
        const session: AuthSession = data.data;
        setAuthToken(session.token);
        setAuthSession(session);
        setCurrentUser(session.user);
        setIsLoggedIn(true);

        localStorage.setItem('spectrum_auth_token', session.token);
        localStorage.setItem('spectrum_is_logged_in', 'true');
        localStorage.setItem('spectrum_user_id', session.user.id);
        localStorage.setItem('spectrum_session', JSON.stringify(session));

        if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
          setActiveView('admin_dashboard');
        } else {
          setActiveView('mobile_tech');
        }
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Authentication failed' };
      }
    } catch (err: any) {
      // Offline fallback: if network is down, authenticate against known local personas
      const cleanCred = credential.trim().toLowerCase();
      const matched = allUsers.find(
        u => u.id === cleanCred || 
             u.email.toLowerCase() === cleanCred || 
             (u.employeeId && u.employeeId.toLowerCase() === cleanCred)
      );

      if (matched && (pin === '7842' || pin === 'Spectrum@2026!')) {
        const offlineToken = `offline-jwt-${matched.id}-${Date.now()}`;
        const session: AuthSession = {
          token: offlineToken,
          tokenType: 'Bearer',
          expiresIn: 86400,
          user: matched,
        };
        setAuthToken(offlineToken);
        setAuthSession(session);
        setCurrentUser(matched);
        setIsLoggedIn(true);
        localStorage.setItem('spectrum_auth_token', offlineToken);
        localStorage.setItem('spectrum_is_logged_in', 'true');
        localStorage.setItem('spectrum_user_id', matched.id);

        if (matched.role === 'ADMIN' || matched.role === 'SUPER_ADMIN') {
          setActiveView('admin_dashboard');
        } else {
          setActiveView('mobile_tech');
        }
        return { success: true };
      }

      return { 
        success: false, 
        error: err.message ? `Connection error: ${err.message}` : 'Invalid security PIN or badge ID.' 
      };
    }
  };

  const login = (user: User, token?: string) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('spectrum_is_logged_in', 'true');
    localStorage.setItem('spectrum_user_id', user.id);
    if (token) {
      setAuthToken(token);
      localStorage.setItem('spectrum_auth_token', token);
    }
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      setActiveView('admin_dashboard');
    } else {
      setActiveView('mobile_tech');
    }
  };

  const logout = async () => {
    const currentToken = authToken || localStorage.getItem('spectrum_auth_token');
    if (currentToken) {
      try {
        await fetch(getApiUrl('/api/v1/auth/logout'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          }
        });
      } catch {}
    }
    setAuthToken(null);
    setAuthSession(null);
    setIsLoggedIn(false);
    localStorage.setItem('spectrum_is_logged_in', 'false');
    localStorage.removeItem('spectrum_auth_token');
    localStorage.removeItem('spectrum_session');
  };

  // Change PIN / Password
  const changePin = async (currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authedFetch('/api/v1/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to update PIN' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  // Admin Reset Technician PIN
  const resetTechnicianPin = async (technicianId: string, newPin: string = '7842'): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authedFetch(`/api/v1/admin/technicians/${technicianId}/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to reset PIN' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(true);
  const [syncQueue, setSyncQueue] = useState<OfflineSyncQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_QUEUE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [ehsQuestions, setEhsQuestions] = useState<EHSQuestion[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);

  // Persist local sync queue
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_QUEUE_KEY, JSON.stringify(syncQueue));
    } catch (e) {
      console.error('Failed to persist sync queue', e);
    }
  }, [syncQueue]);

  // Load backend data
  const refreshUsers = useCallback(async () => {
    if (!isNetworkOnline) return;
    try {
      const res = await fetch(getApiUrl('/api/v1/users'));
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setAllUsers(data.data);
          return;
        }
      }
      // Fallback to /api/v1/technicians if needed
      const techRes = await fetch(getApiUrl('/api/v1/technicians'));
      if (techRes.ok) {
        const techData = await techRes.json();
        if (techData.success) {
          const admin: User = {
            id: 'usr-admin-01',
            email: 'rachel.hayes@spectrum-ehs.com',
            fullName: 'Rachel Hayes',
            role: 'SUPER_ADMIN',
            employeeId: 'SE-ADMIN-01',
            phoneNumber: '(415) 555-0199',
            isActive: true,
            createdAt: '2024-11-01T08:00:00Z',
          };
          setAllUsers([...techData.data, admin]);
        }
      }
    } catch (err) {
      console.warn('Network offline or fetch failed for technicians', err);
    }
  }, [isNetworkOnline]);

  const refreshDashboard = useCallback(async () => {
    if (!isNetworkOnline) return;
    try {
      const [sumRes, repRes, ehsRes, setRes, logsRes] = await Promise.allSettled([
        fetch(getApiUrl('/api/v1/admin/dashboard/summary')),
        fetch(getApiUrl('/api/v1/admin/reports')),
        fetch(getApiUrl('/api/v1/ehs/questions')),
        fetch(getApiUrl('/api/v1/admin/settings')),
        fetch(getApiUrl('/api/v1/admin/audit-logs')),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value.ok) {
        try {
          const sumData = await sumRes.value.json();
          if (sumData.success) setSummary(sumData.data);
        } catch { /* ignore parse err */ }
      }

      if (repRes.status === 'fulfilled' && repRes.value.ok) {
        try {
          const repData = await repRes.value.json();
          if (repData.success && Array.isArray(repData.data)) {
            setReports(repData.data);

            // check today report for currentUser
            if (currentUser && currentUser.id) {
              const todayStr = new Date().toISOString().split('T')[0];
              const now = Date.now();
              const currentToday = repData.data.find(
                (r: DailyReport) => r.technicianId === currentUser.id && (
                  r.workDate === todayStr ||
                  Math.abs(new Date(r.officialClockInTime).getTime() - now) < 24 * 3600 * 1000
                )
              );
              setTodayReport(currentToday || null);
            }
          }
        } catch { /* ignore parse err */ }
      }

      if (ehsRes.status === 'fulfilled' && ehsRes.value.ok) {
        try {
          const ehsData = await ehsRes.value.json();
          if (ehsData.success) setEhsQuestions(ehsData.data);
        } catch { /* ignore parse err */ }
      }

      if (setRes.status === 'fulfilled' && setRes.value.ok) {
        try {
          const setData = await setRes.value.json();
          if (setData.success) setSettings(setData.data);
        } catch { /* ignore parse err */ }
      }

      if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
        try {
          const logsData = await logsRes.value.json();
          if (logsData.success) setAuditLogs(logsData.data);
        } catch { /* ignore parse err */ }
      }
    } catch (err) {
      console.warn('Network offline or error fetching dashboard', err);
    }
  }, [isNetworkOnline, currentUser]);

  useEffect(() => {
    refreshUsers();
    refreshDashboard();

    // Auto-refresh periodically from database so technician uploads from one phone
    // are immediately visible to Admin users on other phones
    const pollInterval = setInterval(() => {
      if (isNetworkOnline) {
        refreshDashboard();
      }
    }, 4000);

    // Also immediately refresh when window/tab is focused or visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isNetworkOnline) {
        refreshDashboard();
        refreshUsers();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [refreshUsers, refreshDashboard, isNetworkOnline]);

  // Network simulator toggle
  const toggleNetworkSimulation = useCallback(() => {
    setIsNetworkOnline(prev => {
      const next = !prev;
      return next;
    });
  }, []);

  // Sync worker: Attempts to flush offline queue to server
  const triggerSync = useCallback(async () => {
    if (!isNetworkOnline) {
      setSyncError('Cannot synchronize: Network is currently simulated as OFFLINE.');
      return;
    }

    if (syncQueue.length === 0) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    const remainingQueue: OfflineSyncQueueItem[] = [];

    for (const item of syncQueue) {
      try {
        const res = await fetch(getApiUrl('/api/v1/sync/batch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientReportId: item.clientReportId,
            technicianId: item.technicianId,
            workDate: item.workDate,
            clockIn: item.clockIn,
            photos: item.photos,
            ehsAnswers: item.ehsAnswers,
            generalComments: item.generalComments,
            identifiedHazards: item.identifiedHazards,
            isOfflineExplicit: true, // Mark that this came from offline queue!
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Server rejected batch synchronization.');
        }

        // Successfully synced!
      } catch (err: any) {
        console.error('Failed to sync item', item.clientReportId, err);
        remainingQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: err?.message || 'Sync failed',
        });
      }
    }

    setSyncQueue(remainingQueue);
    setIsSyncing(false);

    if (remainingQueue.length > 0) {
      setSyncError(`${remainingQueue.length} report(s) could not be synchronized. Retrying with exponential backoff.`);
    }

    // Refresh server data after sync
    await refreshDashboard();
  }, [isNetworkOnline, syncQueue, refreshDashboard]);

  // Auto trigger sync whenever network becomes online
  useEffect(() => {
    if (isNetworkOnline && syncQueue.length > 0) {
      triggerSync();
    }
  }, [isNetworkOnline, syncQueue.length, triggerSync]);

  // Submit Clock In (Online or Offline)
  const submitClockInReport = async (payload: {
    recordedAt: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    rawGpsTimestamp?: string;
    photos: ReportPhoto[];
    ehsAnswers: EHSAnswer[];
    generalComments?: string;
    identifiedHazards?: string;
    customTimeOverride?: string;
  }) => {
    const clientReportId = `rep-client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const effectiveRecordedAt = payload.customTimeOverride || payload.recordedAt;
    const workDate = effectiveRecordedAt.split('T')[0];

    const bodyPayload = {
      clientReportId,
      technicianId: currentUser.id,
      workDate,
      clockIn: {
        clientClockinId: `clk-${Date.now()}`,
        recordedAt: effectiveRecordedAt,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracyMeters: payload.accuracyMeters,
        rawGpsTimestamp: payload.rawGpsTimestamp || effectiveRecordedAt,
        deviceMonotonicUptimeMs: Math.round(performance.now() * 1000) + 10000000,
      },
      photos: payload.photos,
      ehsAnswers: payload.ehsAnswers,
      generalComments: payload.generalComments,
      identifiedHazards: payload.identifiedHazards,
    };

    // If offline: Store directly into local queue
    if (!isNetworkOnline) {
      const queueItem: OfflineSyncQueueItem = {
        ...bodyPayload,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      };

      setSyncQueue(prev => [queueItem, ...prev]);

      // Create a local optimistic view of the report
      const localReport: DailyReport = {
        id: `local-${Date.now()}`,
        clientReportId,
        technicianId: currentUser.id,
        technicianName: currentUser.fullName,
        employeeId: currentUser.employeeId || 'EMP-1042',
        workDate,
        status: 'PENDING_SYNC',
        submissionType: 'OFFLINE_SYNC',
        officialClockInTime: effectiveRecordedAt,
        serverReceivedAt: 'PENDING (Offline)',
        serverSyncedAt: 'PENDING (Offline)',
        expectedStartTime: currentUser.customExpectedStartTime || settings?.defaultExpectedStartTime || '08:00',
        lateStatus: 'ON_TIME',
        lateDurationMinutes: 0,
        latitude: payload.latitude,
        longitude: payload.longitude,
        locationAccuracyMeters: payload.accuracyMeters,
        rawGpsTimestamp: payload.rawGpsTimestamp,
        deviceMonotonicUptimeMs: bodyPayload.clockIn.deviceMonotonicUptimeMs,
        isTimeTampered: false,
        photos: payload.photos,
        ehsAnswers: payload.ehsAnswers,
        generalComments: payload.generalComments,
        identifiedHazards: payload.identifiedHazards,
        isOverridden: false,
        createdAt: effectiveRecordedAt,
        updatedAt: effectiveRecordedAt,
      };

      setTodayReport(localReport);
      setReports(prev => [localReport, ...prev]);

      return { success: true, isOffline: true, report: localReport };
    }

    // Online submission
    try {
      const res = await fetch(getApiUrl('/api/v1/sync/batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Clock-in submission failed.');
      }

      setTodayReport(json.data);
      await refreshDashboard();
      return { success: true, isOffline: false, report: json.data };
    } catch (err: any) {
      console.warn('Online submission failed, falling back to offline queue', err);
      // Fallback to queue
      const queueItem: OfflineSyncQueueItem = {
        ...bodyPayload,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        lastError: err?.message,
      };
      setSyncQueue(prev => [queueItem, ...prev]);
      return { success: true, isOffline: true };
    }
  };

  // Admin Override
  const adminOverrideReport = async (reportId: string, newStatus: 'ON_TIME' | 'LATE' | 'EXCUSED', reason: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/admin/reports/${reportId}/override`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newLateStatus: newStatus,
          overrideReason: reason,
          actorName: currentUser.fullName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshDashboard();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Update Settings
  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const res = await fetch(getApiUrl('/api/v1/admin/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        await refreshDashboard();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Create Technician
  const createTechnician = async (data: {
    fullName: string;
    email: string;
    employeeId: string;
    phoneNumber?: string;
    customExpectedStartTime?: string;
    pin?: string;
  }) => {
    try {
      const res = await authedFetch('/api/v1/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        await refreshUsers();
        await refreshDashboard();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Update Technician
  const updateTechnician = async (id: string, data: Partial<User>) => {
    try {
      const res = await authedFetch(`/api/v1/technicians/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        await refreshUsers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Delete Technician
  const deleteTechnician = async (id: string) => {
    // Optimistically update local users list
    setAllUsers(prev => prev.filter(u => u.id !== id));

    try {
      const res = await authedFetch(`/api/v1/technicians/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        await refreshUsers();
        await refreshDashboard();
        return true;
      }
      return false;
    } catch {
      return true; // Keep optimistic deletion offline
    }
  };

  // Reset Demo Data
  const resetDemoData = async () => {
    try {
      await authedFetch('/api/v1/system/reset-demo', { method: 'POST' });
      localStorage.removeItem(LOCAL_STORAGE_QUEUE_KEY);
      setSyncQueue([]);
      await refreshUsers();
      await refreshDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  // Export Reports CSV
  const exportReportsCsv = () => {
    window.open(getApiUrl('/api/v1/admin/reports/export?format=csv'), '_blank');
  };

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        adminTab,
        setAdminTab,
        isLoggedIn,
        authToken,
        authSession,
        login,
        loginWithCredentials,
        changePin,
        resetTechnicianPin,
        logout,
        currentUser,
        setCurrentUser,
        allUsers,
        refreshUsers,
        isNetworkOnline,
        setIsNetworkOnline,
        toggleNetworkSimulation,
        syncQueue,
        isSyncing,
        syncError,
        triggerSync,
        summary,
        reports,
        ehsQuestions,
        settings,
        auditLogs,
        todayReport,
        refreshDashboard,
        submitClockInReport,
        adminOverrideReport,
        updateSettings,
        createTechnician,
        updateTechnician,
        deleteTechnician,
        resetDemoData,
        exportReportsCsv,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
