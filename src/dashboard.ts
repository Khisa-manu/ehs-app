import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './dashboard.css';
import * as bootstrap from 'bootstrap';

// Types
export interface Technician {
  id: string;
  fullName: string;
  email: string;
  role: string;
  employeeId: string;
  phoneNumber?: string;
  customExpectedStartTime?: string;
  isActive: boolean;
  isClockedIn?: boolean;
}

export interface ClockReport {
  id: string;
  client_report_id?: string;
  technician_id: string;
  technician_name: string;
  employee_id: string;
  work_date: string;
  status: string;
  submission_type: string;
  official_clock_in_time: string;
  late_status: 'ON_TIME' | 'LATE' | 'EXCUSED';
  late_duration_minutes: number;
  latitude: number;
  longitude: number;
  location_accuracy_meters: number;
  photos_json?: string;
  ehs_answers_json?: string;
  general_comments?: string;
  identified_hazards?: string;
}

export interface Incident {
  id: string;
  technician_id: string;
  technician_name: string;
  title: string;
  incident_type: string;
  risk_level: string;
  description: string;
  immediate_action_taken: string;
  latitude?: number;
  longitude?: number;
  photo_url?: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  resolution_notes?: string;
  created_at?: string;
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

// App State
class DashboardApp {
  private activeTab = 'overview';
  private summary: DashboardSummary | null = null;
  private technicians: Technician[] = [];
  private reports: ClockReport[] = [];
  private incidents: Incident[] = [];
  private autoRefreshTimer: number | null = null;
  private isAutoRefreshPaused = false;
  private activeIncidentForEdit: Incident | null = null;

  init() {
    this.setupNavigation();
    this.setupEventListeners();
    this.loadAllData();
    this.startAutoRefresh();
  }

  // Navigation tabs
  private setupNavigation() {
    const navLinks = document.querySelectorAll<HTMLElement>('.sidebar-nav .nav-link');
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = link.getAttribute('data-tab');
        if (tabId) {
          this.switchTab(tabId);
        }
      });
    });
  }

  switchTab(tabId: string) {
    this.activeTab = tabId;

    // Update active nav link
    document.querySelectorAll('.sidebar-nav .nav-link').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-tab') === tabId);
    });

    // Toggle content sections
    document.querySelectorAll('.content-section').forEach((sec) => {
      sec.classList.add('d-none');
    });
    const targetSection = document.getElementById(`sec-${tabId}`);
    if (targetSection) {
      targetSection.classList.remove('d-none');
    }

    // Refresh tab-specific views if needed
    if (tabId === 'clockins') this.renderClockInsTable();
    if (tabId === 'hazards') this.renderHazardsList();
    if (tabId === 'technicians') this.renderTechniciansList();
    if (tabId === 'photos') this.renderPhotoVault();
    if (tabId === 'sync') this.renderSyncAuditLogs();
  }

  private setupEventListeners() {
    // Refresh button
    document.getElementById('btnRefresh')?.addEventListener('click', () => {
      this.loadAllData(true);
    });

    // Auto-refresh pause toggle
    document.getElementById('btnToggleAutoRefresh')?.addEventListener('click', () => {
      this.isAutoRefreshPaused = !this.isAutoRefreshPaused;
      const icon = document.getElementById('autoRefreshIcon');
      const text = document.getElementById('autoRefreshText');
      if (this.isAutoRefreshPaused) {
        if (icon) icon.className = 'bi bi-play-fill';
        if (text) text.textContent = 'Resume';
        this.showToast('Auto-refresh paused', 'secondary');
      } else {
        if (icon) icon.className = 'bi bi-pause-fill';
        if (text) text.textContent = 'Pause';
        this.showToast('Auto-refresh active (10s)', 'info');
        this.loadAllData(false);
      }
    });

    // Report Incident Form
    const photoFileInput = document.getElementById('inputIncidentPhotoFile') as HTMLInputElement | null;
    photoFileInput?.addEventListener('change', () => {
      const file = photoFileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          const hiddenPhoto = document.getElementById('hiddenIncidentPhoto') as HTMLInputElement | null;
          if (hiddenPhoto) hiddenPhoto.value = (loadEvt.target?.result as string) || '';
        };
        reader.readAsDataURL(file);
      }
    });

    const incidentForm = document.getElementById('formReportIncident') as HTMLFormElement | null;
    incidentForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleIncidentSubmit();
    });

    // Add Technician Form
    const techForm = document.getElementById('formAddTech') as HTMLFormElement | null;
    techForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddTechnicianSubmit();
    });

    // Update Incident Status Form
    const updateIncidentForm = document.getElementById('formUpdateIncident') as HTMLFormElement | null;
    updateIncidentForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleIncidentStatusUpdate();
    });

    // Clock-in filters
    document.getElementById('filterDate')?.addEventListener('change', () => this.renderClockInsTable());
    document.getElementById('filterStatus')?.addEventListener('change', () => this.renderClockInsTable());
    document.getElementById('searchClockIns')?.addEventListener('input', () => this.renderClockInsTable());

    // Hazard filters
    document.querySelectorAll('.filter-hazard-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        document.querySelectorAll('.filter-hazard-btn').forEach((b) => b.classList.remove('active', 'btn-primary'));
        target.classList.add('active', 'btn-primary');
        const filterVal = target.getAttribute('data-filter') || 'ALL';
        this.renderHazardsList(filterVal);
      });
    });

    // Trigger system health check
    const btnHealth = document.getElementById('btnHealthCheck') || document.getElementById('btnSimulateSync');
    btnHealth?.addEventListener('click', () => {
      this.runSystemHealthCheck();
    });

    // Export CSV
    document.getElementById('btnExportCsv')?.addEventListener('click', () => {
      window.location.href = '/api/v1/admin/reports/export';
    });

    // Photo vault filter
    document.getElementById('photoFilterSelect')?.addEventListener('change', () => {
      this.renderPhotoVault();
    });

    // Quick user switch in navbar
    document.querySelectorAll('.btn-switch-user').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const userName = el.getAttribute('data-user-name') || 'Rachel Hayes';
        const userRole = el.getAttribute('data-user-role') || 'SUPER_ADMIN';
        const currentNameEl = document.getElementById('currentUserDisplay');
        if (currentNameEl) currentNameEl.textContent = `${userName} (${userRole})`;
        this.showToast(`Switched active profile to ${userName}`, 'success');
      });
    });
  }

  private startAutoRefresh() {
    if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
    this.autoRefreshTimer = window.setInterval(() => {
      if (!this.isAutoRefreshPaused) {
        this.loadAllData(false);
      }
    }, 10000);
  }

  async loadAllData(showIndicator = false) {
    const refreshBtn = document.getElementById('btnRefresh');
    if (showIndicator && refreshBtn) {
      refreshBtn.classList.add('disabled');
      refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Loading...';
    }

    try {
      // 1. Health check
      this.checkServerHealth();

      // 2. Load summary
      const sumRes = await fetch('/api/v1/admin/dashboard/summary');
      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        this.summary = sumJson.data;
        this.renderOverviewMetrics();
      }

      // 3. Load technicians
      const techRes = await fetch('/api/v1/technicians');
      if (techRes.ok) {
        const techJson = await techRes.json();
        this.technicians = techJson.data || [];
        this.renderTechniciansList();
      }

      // 4. Load reports
      const repRes = await fetch('/api/v1/admin/reports?dateFilter=all');
      if (repRes.ok) {
        const repJson = await repRes.json();
        this.reports = repJson.data?.reports || [];
        this.renderClockInsTable();
      }

      // 5. Load incidents
      const incRes = await fetch('/api/v1/ehs/incidents');
      if (incRes.ok) {
        const incJson = await incRes.json();
        this.incidents = incJson.data || [];
        this.renderHazardsList();
        this.renderCriticalHazardBanner();
      }

      // 6. Update timestamp
      const lastSyncEl = document.getElementById('lastUpdatedTime');
      if (lastSyncEl) {
        lastSyncEl.textContent = new Date().toLocaleTimeString();
      }

      if (this.activeTab === 'photos') this.renderPhotoVault();
    } catch (err) {
      console.error('Data load error:', err);
      this.setServerStatus(false);
    } finally {
      if (showIndicator && refreshBtn) {
        refreshBtn.classList.remove('disabled');
        refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Refresh';
      }
    }
  }

  private async checkServerHealth() {
    try {
      const res = await fetch('/api/v1/health');
      if (res.ok) {
        const json = await res.json();
        this.setServerStatus(true, json.database?.activeConnections !== undefined ? 'SQLite WAL Online' : 'Connected');
      } else {
        this.setServerStatus(false);
      }
    } catch {
      this.setServerStatus(false);
    }
  }

  private setServerStatus(online: boolean, detail = 'Offline') {
    const badge = document.getElementById('serverStatusBadge');
    if (!badge) return;
    if (online) {
      badge.className = 'badge bg-success text-white d-inline-flex align-items-center';
      badge.innerHTML = `<span class="pulse-dot me-2"></span> SQLite API Online (${detail})`;
    } else {
      badge.className = 'badge bg-danger text-white d-inline-flex align-items-center';
      badge.innerHTML = `<i class="bi bi-exclamation-circle-fill me-1"></i> API Disconnected`;
    }
  }

  // -------------------------------------------------------------
  // Renderers
  // -------------------------------------------------------------

  private renderOverviewMetrics() {
    if (!this.summary) return;

    const totalTechs = document.getElementById('kpiTotalTechs');
    const clockedIn = document.getElementById('kpiClockedIn');
    const onTimePercent = document.getElementById('kpiOnTimePercent');
    const criticalHazards = document.getElementById('kpiCriticalHazards');
    const pendingSync = document.getElementById('kpiPendingSync');

    if (totalTechs) totalTechs.textContent = String(this.summary.totalTechnicians);
    if (clockedIn) clockedIn.textContent = `${this.summary.clockedIn} / ${this.summary.totalTechnicians}`;

    const percent = this.summary.clockedIn > 0 
      ? Math.round((this.summary.onTime / this.summary.clockedIn) * 100) 
      : 100;
    if (onTimePercent) onTimePercent.textContent = `${percent}%`;

    const critCount = this.incidents.filter(i => i.risk_level === 'CRITICAL_STOP_WORK' || i.risk_level === 'HIGH').length;
    if (criticalHazards) criticalHazards.textContent = String(critCount);

    if (pendingSync) pendingSync.textContent = String(this.summary.pendingSync);

    // Progress Bar
    const progBar = document.getElementById('attendanceProgressBar');
    if (progBar && this.summary.totalTechnicians > 0) {
      const p = Math.round((this.summary.clockedIn / this.summary.totalTechnicians) * 100);
      progBar.style.width = `${p}%`;
      progBar.textContent = `${p}% (${this.summary.clockedIn}/${this.summary.totalTechnicians})`;
    }

    this.renderRecentActivityFeed();
  }

  private renderCriticalHazardBanner() {
    const banner = document.getElementById('criticalHazardBanner');
    if (!banner) return;
    const criticals = this.incidents.filter(i => (i.risk_level === 'CRITICAL_STOP_WORK' || i.risk_level === 'HIGH') && i.status !== 'RESOLVED');
    if (criticals.length > 0) {
      banner.classList.remove('d-none');
      const item = criticals[0];
      const countEl = document.getElementById('criticalCountText');
      const descEl = document.getElementById('criticalDescText');
      if (countEl) countEl.textContent = `${criticals.length} URGENT EHS HAZARD${criticals.length > 1 ? 'S' : ''} ACTIVE`;
      if (descEl) descEl.textContent = `${item.technician_name}: "${item.title}" — ${item.immediate_action_taken}`;
    } else {
      banner.classList.add('d-none');
    }
  }

  private renderRecentActivityFeed() {
    const feed = document.getElementById('recentActivityList');
    if (!feed) return;

    if (this.reports.length === 0 && this.incidents.length === 0) {
      feed.innerHTML = '<div class="text-muted small p-3 text-center">No recent field activity recorded.</div>';
      return;
    }

    const items: Array<{ time: string; text: string; icon: string; badge: string }> = [];

    this.reports.slice(0, 5).forEach((r) => {
      const isLate = r.late_status === 'LATE';
      items.push({
        time: this.formatTime(r.official_clock_in_time),
        text: `<strong>${r.technician_name}</strong> (${r.employee_id}) clocked in at ${this.formatTime(r.official_clock_in_time)}.`,
        icon: isLate ? 'bi-clock-history text-danger' : 'bi-check-circle-fill text-success',
        badge: isLate ? `<span class="badge badge-late">Late (${r.late_duration_minutes}m)</span>` : '<span class="badge badge-ontime">On Time</span>'
      });
    });

    this.incidents.slice(0, 3).forEach((i) => {
      items.push({
        time: i.created_at ? this.formatTime(i.created_at) : 'Today',
        text: `<strong>EHS Hazard:</strong> ${i.technician_name} reported <em>"${i.title}"</em>.`,
        icon: 'bi-exclamation-triangle-fill text-warning',
        badge: `<span class="badge ${this.getRiskBadgeClass(i.risk_level)}">${i.risk_level.replace(/_/g, ' ')}</span>`
      });
    });

    feed.innerHTML = items
      .map(
        (it) => `
        <li class="list-group-item d-flex justify-content-between align-items-center py-2 px-3 border-0 border-bottom">
          <div class="d-flex align-items-center">
            <i class="bi ${it.icon} fs-5 me-3"></i>
            <div>
              <div class="small">${it.text}</div>
              <div class="text-muted" style="font-size: 0.75rem;">${it.time}</div>
            </div>
          </div>
          <div>${it.badge}</div>
        </li>
      `
      )
      .join('');
  }

  private renderClockInsTable() {
    const tbody = document.getElementById('clockInsTableBody');
    if (!tbody) return;

    const dateFilter = (document.getElementById('filterDate') as HTMLSelectElement)?.value || 'ALL';
    const statusFilter = (document.getElementById('filterStatus') as HTMLSelectElement)?.value || 'ALL';
    const search = ((document.getElementById('searchClockIns') as HTMLInputElement)?.value || '').toLowerCase().trim();

    const todayStr = new Date().toISOString().split('T')[0];

    const filtered = this.reports.filter((r) => {
      if (dateFilter === 'TODAY' && r.work_date !== todayStr) return false;
      if (statusFilter === 'ON_TIME' && r.late_status !== 'ON_TIME') return false;
      if (statusFilter === 'LATE' && r.late_status !== 'LATE') return false;
      if (search) {
        const hay = `${r.technician_name} ${r.employee_id} ${r.general_comments || ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    const countBadge = document.getElementById('clockInsCountBadge');
    if (countBadge) countBadge.textContent = `${filtered.length} entries`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-3 d-block mb-2"></i>
            No clock-in records match the current filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((r) => {
        let photos: any[] = [];
        try {
          photos = JSON.parse(r.photos_json || '[]');
        } catch {}

        const ppePhoto = photos.find((p) => p.photoType === 'PPE_SELFIE')?.dataUrl;
        const toolPhoto = photos.find((p) => p.photoType === 'TOOLS_MACHINERY')?.dataUrl;
        const vehiclePhoto = photos.find((p) => p.photoType === 'VEHICLE_360')?.dataUrl;
        const ladderPhoto = photos.find((p) => p.photoType === 'LADDER_SAFETY')?.dataUrl;

        const photoThumbs = [
          { label: 'PPE', url: ppePhoto },
          { label: 'Tools', url: toolPhoto },
          { label: 'Vehicle', url: vehiclePhoto },
          { label: 'Ladder', url: ladderPhoto },
        ]
          .map((p) => {
            if (p.url && p.url.trim().length > 0) {
              return `
              <img src="${p.url}" title="${p.label} Evidence" class="photo-thumb me-1" 
                   onclick="window.dashboardApp.openPhotoLightbox('${p.url}', '${p.label} - ${r.technician_name}')" />
            `;
            }
            return `<div class="photo-thumb-empty me-1" title="${p.label} pending">${p.label}</div>`;
          })
          .join('');

        const isLate = r.late_status === 'LATE';
        const lateBadge = isLate
          ? `<span class="badge badge-late"><i class="bi bi-exclamation-circle me-1"></i>Late (+${r.late_duration_minutes}m)</span>`
          : `<span class="badge badge-ontime"><i class="bi bi-check-circle me-1"></i>On Time</span>`;

        const isOffline = r.submission_type === 'OFFLINE_SYNC';
        const syncBadge = isOffline
          ? `<span class="badge bg-secondary text-white" title="Captured offline, synced on reconnect"><i class="bi bi-cloud-arrow-up me-1"></i>Offline Sync</span>`
          : `<span class="badge bg-primary text-white"><i class="bi bi-wifi me-1"></i>Live Online</span>`;

        return `
        <tr>
          <td>
            <div class="fw-bold">${r.technician_name}</div>
            <div class="font-mono text-muted small">${r.employee_id}</div>
          </td>
          <td>
            <div>${r.work_date}</div>
            <div class="text-muted small font-mono">${this.formatTime(r.official_clock_in_time)}</div>
          </td>
          <td>${lateBadge}</td>
          <td>
            <div class="font-mono small">${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}</div>
            <div class="text-muted" style="font-size: 0.75rem;">Acc: ±${Math.round(r.location_accuracy_meters)}m</div>
            <a href="https://maps.google.com/?q=${r.latitude},${r.longitude}" target="_blank" class="small text-decoration-none">
              <i class="bi bi-geo-alt"></i> Map
            </a>
          </td>
          <td>
            <div>${syncBadge}</div>
            <div class="text-muted small">${r.status}</div>
          </td>
          <td>
            <div class="d-flex">${photoThumbs}</div>
          </td>
          <td>
            <div class="small text-truncate" style="max-width: 180px;" title="${r.general_comments || 'No comments'}">
              ${r.general_comments || '<span class="text-muted">None</span>'}
            </div>
          </td>
        </tr>
      `;
      })
      .join('');
  }

  private renderHazardsList(filter = 'ALL') {
    const container = document.getElementById('hazardsListContainer');
    if (!container) return;

    const filtered = this.incidents.filter((inc) => {
      if (filter === 'CRITICAL' && inc.risk_level !== 'CRITICAL_STOP_WORK') return false;
      if (filter === 'HIGH' && inc.risk_level !== 'HIGH') return false;
      if (filter === 'OPEN' && inc.status !== 'OPEN') return false;
      if (filter === 'RESOLVED' && inc.status !== 'RESOLVED') return false;
      return true;
    });

    const badge = document.getElementById('hazardsCountBadge');
    if (badge) badge.textContent = `${filtered.length} total`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card p-5 text-center text-muted">
          <i class="bi bi-shield-check fs-1 text-success mb-2"></i>
          <h5>No Active Hazards Found</h5>
          <p class="small mb-0">No safety incident reports match this filter criteria.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map((inc) => {
        const riskBadge = `<span class="badge ${this.getRiskBadgeClass(inc.risk_level)} px-2 py-1">${inc.risk_level.replace(/_/g, ' ')}</span>`;
        const statusBadge = inc.status === 'RESOLVED'
          ? '<span class="badge bg-success"><i class="bi bi-check2-all me-1"></i>RESOLVED</span>'
          : inc.status === 'INVESTIGATING'
          ? '<span class="badge bg-warning text-dark"><i class="bi bi-search me-1"></i>INVESTIGATING</span>'
          : '<span class="badge bg-danger"><i class="bi bi-exclamation-diamond me-1"></i>OPEN</span>';

        const photoHtml = inc.photo_url
          ? `<img src="${inc.photo_url}" class="rounded border ms-3 photo-thumb" style="width: 72px; height: 72px;" onclick="window.dashboardApp.openPhotoLightbox('${inc.photo_url}', '${inc.title}')" title="View attached evidence" />`
          : '';

        return `
        <div class="card mb-3 border ${inc.risk_level === 'CRITICAL_STOP_WORK' ? 'border-danger' : 'border-secondary-subtle'}">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="d-flex align-items-center mb-1">
                  ${riskBadge}
                  <span class="ms-2 badge bg-light text-dark border">${inc.incident_type}</span>
                  <span class="ms-2">${statusBadge}</span>
                </div>
                <h5 class="card-title fw-bold text-dark mt-2 mb-1">${inc.title}</h5>
                <div class="small text-muted mb-2">
                  Reported by <strong>${inc.technician_name}</strong> • ${inc.created_at ? this.formatDate(inc.created_at) : 'Recent'}
                </div>
              </div>
              <div>${photoHtml}</div>
            </div>

            <p class="card-text small text-secondary mb-2">${inc.description}</p>

            <div class="bg-light p-2 rounded small mb-2 border">
              <strong>Immediate Action Taken:</strong> ${inc.immediate_action_taken || 'No action recorded.'}
            </div>

            ${
              inc.resolution_notes
                ? `<div class="alert alert-success py-1 px-2 small mb-2"><i class="bi bi-check-circle-fill me-1"></i><strong>Resolution Notes:</strong> ${inc.resolution_notes}</div>`
                : ''
            }

            <div class="d-flex justify-content-between align-items-center mt-2">
              <div class="font-mono text-muted small">
                ${inc.latitude && inc.longitude ? `📍 ${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}` : '📍 Location logged'}
              </div>
              <button class="btn btn-sm btn-outline-primary" onclick="window.dashboardApp.openIncidentStatusModal('${inc.id}')">
                <i class="bi bi-pencil-square me-1"></i> Update Status & Notes
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  private renderTechniciansList() {
    const container = document.getElementById('techListContainer');
    if (!container) return;

    if (this.technicians.length === 0) {
      container.innerHTML = '<div class="text-center text-muted p-4">No technicians registered.</div>';
      return;
    }

    const todayReports = this.reports;
    const clockedInTechIds = new Set(todayReports.map(r => r.technician_id));

    container.innerHTML = this.technicians
      .map((tech) => {
        const isClockedIn = clockedInTechIds.has(tech.id);
        const initials = tech.fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase();

        return `
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card h-100 kpi-card">
            <div class="card-body">
              <div class="d-flex align-items-center mb-3">
                <div class="bg-warning text-dark fw-bold rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px; font-size: 1.1rem;">
                  ${initials}
                </div>
                <div>
                  <h6 class="fw-bold mb-0">${tech.fullName}</h6>
                  <div class="font-mono text-muted small">${tech.employeeId}</div>
                </div>
                <div class="ms-auto">
                  ${isClockedIn 
                    ? '<span class="badge badge-ontime"><i class="bi bi-check-circle me-1"></i>Clocked In</span>' 
                    : '<span class="badge bg-secondary text-white">Off Shift</span>'}
                </div>
              </div>

              <div class="small text-muted mb-2">
                <div><i class="bi bi-briefcase me-1"></i> ${tech.role}</div>
                <div><i class="bi bi-envelope me-1"></i> ${tech.email}</div>
                <div><i class="bi bi-clock me-1"></i> Shift Start: ${tech.customExpectedStartTime || '08:00'}</div>
                ${tech.phoneNumber ? `<div><i class="bi bi-telephone me-1"></i> ${tech.phoneNumber}</div>` : ''}
              </div>

              <div class="d-flex justify-content-between align-items-center pt-2 border-top mt-2">
                <span class="small font-mono text-muted">PIN: 7842</span>
                <div>
                  <button class="btn btn-sm btn-outline-danger" title="Remove technician" onclick="window.dashboardApp.deleteTechnician('${tech.id}', '${tech.fullName}')">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  private renderPhotoVault() {
    const container = document.getElementById('photoVaultContainer');
    if (!container) return;

    const filterType = (document.getElementById('photoFilterSelect') as HTMLSelectElement)?.value || 'ALL';

    const photoItems: Array<{ url: string; type: string; techName: string; time: string; reportId: string }> = [];

    // Extract photos from clock reports
    this.reports.forEach((r) => {
      try {
        const photos = JSON.parse(r.photos_json || '[]');
        photos.forEach((p: any) => {
          if (p.dataUrl && p.dataUrl.trim().length > 0) {
            photoItems.push({
              url: p.dataUrl,
              type: p.photoType || 'EVIDENCE',
              techName: r.technician_name,
              time: p.capturedAt || r.official_clock_in_time,
              reportId: r.id,
            });
          }
        });
      } catch {}
    });

    // Extract photos from incidents
    this.incidents.forEach((inc) => {
      if (inc.photo_url) {
        photoItems.push({
          url: inc.photo_url,
          type: 'INCIDENT_PROOF',
          techName: inc.technician_name,
          time: inc.created_at || 'Recent',
          reportId: inc.id,
        });
      }
    });

    const filtered = photoItems.filter((item) => {
      if (filterType !== 'ALL' && item.type !== filterType) return false;
      return true;
    });

    const badge = document.getElementById('photoCountBadge');
    if (badge) badge.textContent = `${filtered.length} photos`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center text-muted p-5">
          <i class="bi bi-camera fs-1 mb-2 d-block"></i>
          <h5>No Photo Evidence Found</h5>
          <p class="small">Photos taken during mobile clock-in or incident reports will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map(
        (p) => `
        <div class="col-6 col-md-4 col-lg-3 mb-3">
          <div class="card h-100 shadow-sm border overflow-hidden">
            <img src="${p.url}" class="card-img-top" style="height: 160px; object-fit: cover; cursor: pointer;" 
                 onclick="window.dashboardApp.openPhotoLightbox('${p.url}', '${p.type} - ${p.techName}')" />
            <div class="card-body p-2">
              <span class="badge bg-dark text-warning small">${p.type.replace(/_/g, ' ')}</span>
              <div class="fw-bold small mt-1 text-truncate">${p.techName}</div>
              <div class="text-muted" style="font-size: 0.75rem;">${p.time ? this.formatDate(p.time) : ''}</div>
            </div>
          </div>
        </div>
      `
      )
      .join('');
  }

  private renderSyncAuditLogs() {
    const list = document.getElementById('auditLogList');
    if (!list) return;

    fetch('/api/v1/admin/audit-logs')
      .then((r) => r.json())
      .then((data) => {
        const logs: any[] = data.data || [];
        if (logs.length === 0) {
          list.innerHTML = '<div class="p-3 text-muted text-center">No audit logs recorded yet.</div>';
          return;
        }

        list.innerHTML = logs
          .slice(0, 20)
          .map(
            (log) => `
          <div class="p-2 border-bottom d-flex justify-content-between align-items-center">
            <div>
              <span class="badge bg-secondary font-mono">${log.action}</span>
              <span class="ms-2 small fw-bold">${log.actor_name}</span>
              <div class="text-muted small" style="font-size: 0.75rem;">${log.entity_type} ID: ${log.entity_id}</div>
            </div>
            <div class="font-mono text-muted small">${this.formatTime(log.created_at)}</div>
          </div>
        `
          )
          .join('');
      })
      .catch((e) => {
        list.innerHTML = `<div class="p-3 text-danger small">Error loading audit logs: ${e.message}</div>`;
      });
  }

  // -------------------------------------------------------------
  // Actions & Form Handlers
  // -------------------------------------------------------------

  private async handleIncidentSubmit() {
    const title = (document.getElementById('inputIncidentTitle') as HTMLInputElement)?.value;
    const type = (document.getElementById('selectIncidentType') as HTMLSelectElement)?.value;
    const risk = (document.getElementById('selectIncidentRisk') as HTMLSelectElement)?.value;
    const desc = (document.getElementById('textareaIncidentDesc') as HTMLTextAreaElement)?.value;
    const action = (document.getElementById('textareaIncidentAction') as HTMLTextAreaElement)?.value;
    const photoBase64 = (document.getElementById('hiddenIncidentPhoto') as HTMLInputElement)?.value;

    if (!title || !desc || !action) {
      this.showToast('Please fill out all required incident fields.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/v1/ehs/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianId: 'usr-admin-01',
          technicianName: 'Rachel Hayes (Safety Admin)',
          title,
          incidentType: type,
          riskLevel: risk,
          description: desc,
          immediateActionTaken: action,
          photoBase64: photoBase64 || null,
          latitude: 29.7604,
          longitude: -95.3698,
        }),
      });

      if (res.ok) {
        this.showToast('Safety incident logged successfully!', 'success');
        const modalEl = document.getElementById('modalReportIncident');
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          modal?.hide();
        }
        (document.getElementById('formReportIncident') as HTMLFormElement)?.reset();
        this.loadAllData();
      } else {
        const err = await res.json();
        this.showToast(`Error: ${err.error || 'Failed to submit'}`, 'danger');
      }
    } catch (e: any) {
      this.showToast(`Submission failed: ${e.message}`, 'danger');
    }
  }

  private async handleAddTechnicianSubmit() {
    const fullName = (document.getElementById('inputTechName') as HTMLInputElement)?.value;
    const employeeId = (document.getElementById('inputTechCode') as HTMLInputElement)?.value;
    const email = (document.getElementById('inputTechEmail') as HTMLInputElement)?.value;
    const phone = (document.getElementById('inputTechPhone') as HTMLInputElement)?.value;
    const shift = (document.getElementById('inputTechShift') as HTMLInputElement)?.value || '08:00';
    const pin = (document.getElementById('inputTechPin') as HTMLInputElement)?.value || '7842';

    if (!fullName || !employeeId || !email) {
      this.showToast('Name, Employee ID, and Email are required.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/v1/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          employeeId,
          email,
          phoneNumber: phone,
          customExpectedStartTime: shift,
          pin,
        }),
      });

      if (res.ok) {
        this.showToast(`Technician ${fullName} registered!`, 'success');
        const modalEl = document.getElementById('modalAddTech');
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          modal?.hide();
        }
        (document.getElementById('formAddTech') as HTMLFormElement)?.reset();
        this.loadAllData();
      } else {
        const err = await res.json();
        this.showToast(`Failed to register: ${err.error}`, 'danger');
      }
    } catch (e: any) {
      this.showToast(`Error: ${e.message}`, 'danger');
    }
  }

  async deleteTechnician(id: string, name: string) {
    if (!confirm(`Are you sure you want to deactivate and remove technician "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/technicians/${id}`, { method: 'DELETE' });
      if (res.ok) {
        this.showToast(`Technician ${name} removed.`, 'info');
        this.loadAllData();
      } else {
        const err = await res.json();
        this.showToast(`Error: ${err.error}`, 'danger');
      }
    } catch (e: any) {
      this.showToast(`Error: ${e.message}`, 'danger');
    }
  }

  openIncidentStatusModal(incidentId: string) {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (!inc) return;
    this.activeIncidentForEdit = inc;

    const idInput = document.getElementById('modalIncId') as HTMLInputElement;
    const titleText = document.getElementById('modalIncTitleText');
    const statusSelect = document.getElementById('modalIncStatusSelect') as HTMLSelectElement;
    const notesInput = document.getElementById('modalIncResolutionNotes') as HTMLTextAreaElement;

    if (idInput) idInput.value = inc.id;
    if (titleText) titleText.textContent = `${inc.title} (${inc.risk_level})`;
    if (statusSelect) statusSelect.value = inc.status;
    if (notesInput) notesInput.value = inc.resolution_notes || '';

    const modalEl = document.getElementById('modalUpdateIncident');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  private async handleIncidentStatusUpdate() {
    if (!this.activeIncidentForEdit) return;

    const status = (document.getElementById('modalIncStatusSelect') as HTMLSelectElement)?.value;
    const notes = (document.getElementById('modalIncResolutionNotes') as HTMLTextAreaElement)?.value;

    try {
      const res = await fetch(`/api/v1/ehs/incidents/${this.activeIncidentForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolutionNotes: notes }),
      });

      if (res.ok) {
        this.showToast('Incident updated successfully!', 'success');
        const modalEl = document.getElementById('modalUpdateIncident');
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          modal?.hide();
        }
        this.loadAllData();
      } else {
        const err = await res.json();
        this.showToast(`Failed to update: ${err.error}`, 'danger');
      }
    } catch (e: any) {
      this.showToast(`Error: ${e.message}`, 'danger');
    }
  }

  openPhotoLightbox(url: string, title: string) {
    const modalEl = document.getElementById('modalPhotoLightbox');
    const img = document.getElementById('lightboxImage') as HTMLImageElement;
    const caption = document.getElementById('lightboxCaption');
    const downloadBtn = document.getElementById('lightboxDownload') as HTMLAnchorElement;

    if (img) img.src = url;
    if (caption) caption.textContent = title;
    if (downloadBtn) {
      downloadBtn.href = url;
      downloadBtn.download = `evidence-${Date.now()}.jpg`;
    }

    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  async runSystemHealthCheck() {
    const btn = document.getElementById('btnHealthCheck') || document.getElementById('btnSimulateSync');
    if (btn) {
      btn.classList.add('disabled');
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Diagnosing...';
    }

    const startTime = performance.now();
    try {
      const res = await fetch('/api/v1/health');
      const latencyMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json();
        const dbEngine = data.database?.engine || 'Active';
        const reportsCount = data.database?.reportsCount ?? 0;
        this.showToast(
          `System Healthy: Database ${dbEngine} connected (${reportsCount} reports in DB) • Latency: ${latencyMs}ms`,
          'success'
        );
        this.loadAllData();
      } else {
        this.showToast(`Health check returned status ${res.status}`, 'warning');
      }
    } catch (e: any) {
      this.showToast(`Health check failed: ${e.message}`, 'danger');
    } finally {
      if (btn) {
        btn.classList.remove('disabled');
        btn.innerHTML = '<i class="bi bi-heart-pulse me-1"></i> Check Health';
      }
    }
  }

  showToast(message: string, type: 'success' | 'danger' | 'warning' | 'info' | 'secondary' = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type} border-0 mb-2`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body small fw-semibold">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }

  private formatTime(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  }

  private formatDate(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  private getRiskBadgeClass(risk: string): string {
    switch (risk) {
      case 'CRITICAL_STOP_WORK':
        return 'badge-critical';
      case 'HIGH':
        return 'badge-high';
      case 'MEDIUM':
        return 'badge-medium';
      default:
        return 'badge-low';
    }
  }
}

// Attach globally for inline HTML onclick handlers
const app = new DashboardApp();
(window as any).dashboardApp = app;

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
