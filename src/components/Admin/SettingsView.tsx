import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sliders, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  Save, 
  Check, 
  AlertCircle,
  Database,
  KeyRound,
  Lock
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, currentUser, changePin } = useApp();

  const [defaultStartTime, setDefaultStartTime] = useState(settings?.defaultExpectedStartTime || '08:00');
  const [gracePeriod, setGracePeriod] = useState(settings?.gracePeriodMinutes ?? 5);
  const [retentionDays, setRetentionDays] = useState(settings?.maxOfflineRetentionDays ?? 14);
  const [enforceGeofence, setEnforceGeofence] = useState(settings?.enforceGeofence ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Change PIN State
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinChangeSuccess, setPinChangeSuccess] = useState<string | null>(null);
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setDefaultStartTime(settings.defaultExpectedStartTime);
      setGracePeriod(settings.gracePeriodMinutes);
      setRetentionDays(settings.maxOfflineRetentionDays);
      setEnforceGeofence(settings.enforceGeofence);
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const success = await updateSettings({
      defaultExpectedStartTime: defaultStartTime,
      gracePeriodMinutes: Number(gracePeriod),
      maxOfflineRetentionDays: Number(retentionDays),
      enforceGeofence,
    });

    setIsSaving(false);

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError('Failed to save settings.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Title Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FFEBEE] text-[#D32F2F] border border-red-200 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-base text-slate-900">
              System Rules & Clock-In Thresholds
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure global operational parameters and time-drift tolerance.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        
        {/* 1. Default Expected Start Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#D32F2F]" />
              <span>Default Expected Start Time</span>
            </label>
            <span className="text-[11px] font-mono text-slate-500">HH:MM (24-hr)</span>
          </div>
          <input
            type="time"
            value={defaultStartTime}
            onChange={(e) => setDefaultStartTime(e.target.value)}
            className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 font-bold focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE]"
          />
          <p className="text-[11px] text-slate-500">
            Standard daily arrival expectation across all technicians unless overridden per employee.
          </p>
        </div>

        {/* 2. Grace Period Minutes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Grace Period Allowance (Minutes)</span>
            </label>
            <span className="text-[11px] font-mono font-bold text-[#B71C1C] bg-[#FFEBEE] border border-red-200 px-2.5 py-0.5 rounded-full">
              +{gracePeriod} mins buffer
            </span>
          </div>
          <input
            type="number"
            min={0}
            max={60}
            value={gracePeriod}
            onChange={(e) => setGracePeriod(Number(e.target.value))}
            className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 font-bold focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE]"
          />
          <p className="text-[11px] text-slate-500">
            Clock-ins occurring up to {defaultStartTime} + {gracePeriod} minutes are evaluated as <strong>ON TIME</strong>.
          </p>
        </div>

        {/* 3. Offline Data Retention */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-600" />
              <span>Max Offline Queue Retention (Days)</span>
            </label>
            <span className="text-[11px] font-mono text-slate-500">{retentionDays} Days</span>
          </div>
          <input
            type="number"
            min={1}
            max={90}
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 font-bold focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE]"
          />
          <p className="text-[11px] text-slate-500">
            Duration local mobile SQLite databases preserve pending clock-in payloads prior to purge.
          </p>
        </div>

        {/* 4. Enforce Geofence */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              Enforce Jobsite Geofence Radius
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Require technician GPS coordinate fix within 500m of customer site coordinates.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enforceGeofence}
              onChange={(e) => setEnforceGeofence(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D32F2F]" />
          </label>
        </div>

        {/* Feedback states */}
        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-700 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>System settings updated successfully and committed to audit log.</span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 bg-[#FFEBEE] border border-red-200 rounded-2xl text-xs font-bold text-[#D32F2F] flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-[#B71C1C] active:scale-98 text-white font-bold text-xs shadow-md shadow-red-900/10 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Real Security & PIN Management Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-base text-slate-900">
              Account Security & PIN
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Change your personnel access PIN. Secured with Bcrypt encryption and 7-day JWT sessions.
            </p>
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPinChangeError(null);
            setPinChangeSuccess(null);

            if (newPin !== confirmPin) {
              setPinChangeError('New PIN and confirmation do not match.');
              return;
            }
            if (newPin.length < 4) {
              setPinChangeError('PIN must be at least 4 digits.');
              return;
            }

            setIsChangingPin(true);
            const res = await changePin(currentPin, newPin);
            setIsChangingPin(false);

            if (res.success) {
              setPinChangeSuccess('Your security PIN was successfully changed and updated in database.');
              setCurrentPin('');
              setNewPin('');
              setConfirmPin('');
              setTimeout(() => setPinChangeSuccess(null), 4000);
            } else {
              setPinChangeError(res.error || 'Failed to update PIN. Please verify your current PIN.');
            }
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Current PIN *</label>
              <input
                type="password"
                required
                placeholder="••••"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">New PIN *</label>
              <input
                type="password"
                required
                placeholder="4-8 digits"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Confirm New PIN *</label>
              <input
                type="password"
                required
                placeholder="Confirm digits"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-100"
              />
            </div>
          </div>

          {pinChangeSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-700 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{pinChangeSuccess}</span>
            </div>
          )}

          {pinChangeError && (
            <div className="p-3 bg-[#FFEBEE] border border-red-200 rounded-2xl text-xs font-bold text-[#D32F2F] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pinChangeError}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isChangingPin}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isChangingPin ? 'Updating PIN...' : 'Update Security PIN'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
