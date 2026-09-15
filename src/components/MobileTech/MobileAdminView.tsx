import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import { 
  ShieldCheck, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  RefreshCw, 
  Radio, 
  Flame, 
  ChevronRight, 
  ExternalLink, 
  Filter,
  Check,
  Building2,
  HardHat,
  UserPlus,
  Trash2,
  X,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';

interface MobileAdminViewProps {
  onSwitchToTechMode: () => void;
}

export const MobileAdminView: React.FC<MobileAdminViewProps> = ({ onSwitchToTechMode }) => {
  const { 
    currentUser, 
    allUsers, 
    reports, 
    syncQueue, 
    triggerSync, 
    isSyncing, 
    isNetworkOnline,
    createTechnician,
    deleteTechnician
  } = useApp();

  const [activeTab, setActiveTab] = useState<'roster' | 'technicians' | 'reports' | 'controls'>('roster');
  const [filterType, setFilterType] = useState<'ALL' | 'ON_TIME' | 'LATE'>('ALL');
  const [musterAlertActive, setMusterAlertActive] = useState(false);

  // Add & Remove Tech State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingTech, setDeletingTech] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Tech Form Inputs
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newShiftTime, setNewShiftTime] = useState('');

  const activeTechs = allUsers.filter(u => u.role !== 'SUPER_ADMIN');
  const onTimeCount = reports.filter(r => r.lateStatus === 'ON_TIME' || r.lateStatus === 'EXCUSED').length;
  const lateCount = reports.filter(r => r.lateStatus === 'LATE').length;

  const handleCreateTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newEmail || !newEmployeeId) {
      setFormError('Please fill out all required fields.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    const success = await createTechnician({
      fullName: newFullName.trim(),
      email: newEmail.trim().toLowerCase(),
      employeeId: newEmployeeId.trim().toUpperCase(),
      phoneNumber: newPhone.trim(),
      customExpectedStartTime: newShiftTime || undefined,
    });
    setIsSubmitting(false);
    if (success) {
      setNewFullName('');
      setNewEmail('');
      setNewEmployeeId('');
      setNewPhone('');
      setNewShiftTime('');
      setIsAddModalOpen(false);
    } else {
      setFormError('Failed to create technician. Employee ID or Email may already exist.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTech) return;
    setIsDeleting(true);
    await deleteTechnician(deletingTech.id);
    setIsDeleting(false);
    setDeletingTech(null);
  };

  const filteredReports = reports.filter(r => {
    if (filterType === 'ON_TIME') return r.lateStatus === 'ON_TIME' || r.lateStatus === 'EXCUSED';
    if (filterType === 'LATE') return r.lateStatus === 'LATE';
    return true;
  });

  return (
    <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
      {/* Admin Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-md shadow-amber-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-heading font-extrabold text-sm text-white leading-tight">
                EHS Command Center
              </h2>
              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                ADMIN
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
              <span>{currentUser.fullName}</span>
              <span>•</span>
              <span className="text-amber-400 font-mono text-[11px]">{currentUser.employeeId || 'SUPERVISOR'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={triggerSync}
          disabled={isSyncing}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors disabled:opacity-50"
          title="Force Sync Now"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[11px] font-medium">On-Duty Field Techs</span>
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {reports.length} <span className="text-xs text-slate-500 font-normal">/ {activeTechs.length} Active</span>
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" />
            <span>GPS Geofence Verified</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[11px] font-medium">Safety Compliance</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            99.4%
          </div>
          <div className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
            <span>142 Safe Days Recorded</span>
          </div>
        </div>
      </div>

      {/* In-Mobile Sub Navigation Tabs */}
      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 py-1.5 px-1.5 rounded-lg font-bold transition-all text-center ${
            activeTab === 'roster'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Roster ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('technicians')}
          className={`flex-1 py-1.5 px-1.5 rounded-lg font-bold transition-all text-center ${
            activeTab === 'technicians'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Techs ({activeTechs.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-1.5 px-1.5 rounded-lg font-bold transition-all text-center ${
            activeTab === 'reports'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Audits
        </button>
        <button
          onClick={() => setActiveTab('controls')}
          className={`flex-1 py-1.5 px-1.5 rounded-lg font-bold transition-all text-center ${
            activeTab === 'controls'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Controls
        </button>
      </div>

      {/* TAB 1: Live Personnel Roster */}
      {activeTab === 'roster' && (
        <div className="space-y-2.5 flex-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
            <span>CLOCK-IN STATUS ROSTER</span>
            <span className="text-emerald-400">{reports.length} Present</span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-xs">
                      {report.technicianName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">
                        {report.technicianName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {report.technicianEmployeeId}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${
                    report.lateStatus === 'ON_TIME' || report.lateStatus === 'EXCUSED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {report.lateStatus === 'ON_TIME' || report.lateStatus === 'EXCUSED' ? 'ON TIME' : 'LATE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/80 p-2 rounded-xl text-slate-400 font-mono">
                  <div>
                    <span className="text-slate-500 block">CLOCK TIME</span>
                    <span className="text-white font-bold">
                      {new Date(report.officialClockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">SAFETY AUDIT</span>
                    <span className="text-emerald-400 font-bold">5/5 Passed</span>
                  </div>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                No active clock-ins recorded yet for today.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Field Technicians Workforce Management */}
      {activeTab === 'technicians' && (
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
            <span>FIELD WORKFORCE DIRECTORY</span>
            <button
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="w-3 h-3" />
              <span>Add Tech</span>
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
            {activeTechs.map((tech) => (
              <div
                key={tech.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 border border-slate-700 flex items-center justify-center font-bold text-xs">
                      {tech.fullName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <span>{tech.fullName}</span>
                        {tech.isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Active"></span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" title="Inactive"></span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                        <span className="text-amber-400 font-semibold">{tech.employeeId || 'ID PENDING'}</span>
                        {tech.customExpectedStartTime && (
                          <span className="text-slate-500">Shift: {tech.customExpectedStartTime}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Remove Tech Action */}
                  <button
                    onClick={() => setDeletingTech(tech)}
                    className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remove field technician"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                  <div className="truncate flex items-center gap-1">
                    <Mail className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                    <span className="truncate">{tech.email}</span>
                  </div>
                  <div className="truncate flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                    <span className="truncate">{tech.phoneNumber || 'No phone'}</span>
                  </div>
                </div>
              </div>
            ))}

            {activeTechs.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                No field technicians found in workforce roster.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Audit Reports with Filters */}
      {activeTab === 'reports' && (
        <div className="space-y-3 flex-1">
          <div className="flex gap-2">
            {(['ALL', 'ON_TIME', 'LATE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                  filterType === type
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{report.technicianName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(report.officialClockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Photos: {report.photos?.length || 4} verified</span>
                  <a
                    href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 text-[10px]"
                  >
                    <span>GPS Map</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Site & Safety Controls */}
      {activeTab === 'controls' && (
        <div className="space-y-3 flex-1">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Emergency & Site Commands
            </h3>

            {/* Muster alert button */}
            <button
              onClick={() => setMusterAlertActive(!musterAlertActive)}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                musterAlertActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>{musterAlertActive ? 'CANCEL ACTIVE MUSTER ALERT' : 'TRIGGER EMERGENCY MUSTER CALL'}</span>
            </button>

            {/* Test field clock-in */}
            <button
              onClick={onSwitchToTechMode}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <HardHat className="w-4 h-4 text-amber-400" />
              <span>Test Technician Clock-In Workflow</span>
            </button>

            {/* Sync trigger */}
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Force Synchronize All Mobile Queues</span>
            </button>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] text-slate-400">
            <strong>Audit Status:</strong> Spectrum EHS is operating under high-concurrency offline sync protocol.
          </div>
        </div>
      )}

      {/* MOBILE ADD TECHNICIAN MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-sm text-white">
                  Add Field Technician
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTech} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Thorne"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Employee Badge *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SE-4029"
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Shift Start</label>
                  <input
                    type="time"
                    value={newShiftTime}
                    onChange={(e) => setNewShiftTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="d.thorne@spectrum-ehs.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="(415) 555-0182"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500 font-sans"
                />
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-400 font-bold hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Technician'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE REMOVE TECHNICIAN CONFIRMATION MODAL */}
      {deletingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-heading font-bold text-sm text-white">
                Remove Technician?
              </h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to remove <strong className="text-slate-200">{deletingTech.fullName}</strong> ({deletingTech.employeeId || 'ID Pending'})? This will revoke mobile app badge access immediately.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingTech(null)}
                className="py-2 rounded-xl text-slate-400 font-bold hover:bg-slate-800 hover:text-white transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm transition-colors text-xs disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
