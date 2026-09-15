import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClockInWizard } from './ClockInWizard';
import { MobileAdminView } from './MobileAdminView';
import { 
  Wifi, 
  WifiOff, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  HardHat, 
  RefreshCw, 
  Smartphone, 
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Maximize2,
  Minimize2,
  Sparkles,
  Building2,
  LayoutDashboard
} from 'lucide-react';
import { PWAInstallButton } from '../Install/PWAInstallButton';

export const MobileAppShell: React.FC = () => {
  const { 
    currentUser, 
    todayReport, 
    isNetworkOnline, 
    syncQueue, 
    isSyncing, 
    triggerSync, 
    settings 
  } = useApp();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'tech' | 'admin'>(() => {
    return (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') ? 'admin' : 'tech';
  });
  
  // Live current time for real-time field clock
  const [currentTime, setCurrentTime] = useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pendingItemForUser = syncQueue.find(item => item.technicianId === currentUser.id);

  return (
    <div className="py-6 px-3 sm:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      
      {/* View Header Info */}
      <div className="mb-4 flex items-center justify-between w-full max-w-md px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D32F2F]" />
          <span className="text-xs font-semibold text-slate-700 tracking-tight">
            Field Technician Console
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PWAInstallButton />
          <span className="text-[11px] font-mono text-slate-400">
            v2.4 Enterprise
          </span>
        </div>
      </div>

      {/* Main Responsive Mobile Console Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[640px]">
        
        {/* Sleek Sub-header Status Bar */}
        <div className="px-5 py-2.5 flex items-center justify-between text-xs bg-slate-50/90 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isNetworkOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Sync</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#D32F2F] font-bold text-[11px]">
                <WifiOff className="w-3 h-3" />
                <span>Offline Storage</span>
              </span>
            )}
          </div>
        </div>

        {/* Offline Sync Banner if offline or queue > 0 */}
        {(!isNetworkOnline || syncQueue.length > 0) && (
          <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
            !isNetworkOnline
              ? 'bg-[#FFEBEE] text-[#B71C1C] border-red-200/90'
              : 'bg-amber-50 text-amber-900 border-amber-200/80'
          }`}>
            <div className="flex items-center gap-2">
              {!isNetworkOnline ? (
                <WifiOff className="w-3.5 h-3.5 text-[#D32F2F] shrink-0" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              )}
              <span className="text-[11px] font-medium leading-tight">
                {!isNetworkOnline 
                  ? 'Offline Mode: Local SQLite active for verified arrival.' 
                  : `${syncQueue.length} report(s) ready to upload.`}
              </span>
            </div>

            {isNetworkOnline && syncQueue.length > 0 && (
              <button
                onClick={triggerSync}
                disabled={isSyncing}
                className="px-2.5 py-0.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold text-[10px] rounded-md cursor-pointer transition-colors shadow-2xs"
              >
                {isSyncing ? 'Syncing...' : 'Sync'}
              </button>
            )}
          </div>
        )}

        {/* Active Wizard Modal, Admin Mobile Dashboard, or Main Tech Dashboard */}
        {isWizardOpen ? (
          <div className="p-3 sm:p-4 flex-1 flex flex-col">
            <ClockInWizard
              onCancel={() => setIsWizardOpen(false)}
              onCompleted={() => setIsWizardOpen(false)}
            />
          </div>
        ) : mobileTab === 'admin' ? (
          <MobileAdminView onSwitchToTechMode={() => setMobileTab('tech')} />
        ) : (
          <div className="p-5 flex-1 flex flex-col space-y-4">
            
            {/* Technician Identity Header - Clean Card */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFEBEE] text-[#D32F2F] border border-red-200/80 flex items-center justify-center font-extrabold text-sm">
                  {currentUser.fullName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 leading-tight">
                    {currentUser.fullName}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-mono font-bold text-[#B71C1C] bg-[#FFEBEE] px-1.5 py-0.2 rounded">
                      {currentUser.employeeId}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Field Technician
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Target Shift
                </span>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {currentUser.customExpectedStartTime || settings?.defaultExpectedStartTime || '08:00'} AM
                </span>
              </div>
            </div>

            {/* CLOCK-IN STATUS SECTION */}
            {todayReport ? (
              /* ALREADY CLOCKED IN STATE - Clean Modern Card */
              <div className="space-y-4">
                <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-2xs">
                  
                  {/* Top Status Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Clocked In Today</span>
                    </div>

                    {todayReport.lateStatus === 'ON_TIME' || todayReport.lateStatus === 'EXCUSED' ? (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                        ON TIME
                      </span>
                    ) : (
                      <span className="bg-[#FFEBEE] text-[#B71C1C] border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                        LATE ({todayReport.lateDurationMinutes}m)
                      </span>
                    )}
                  </div>

                  {/* Official Clock-in Timestamp Highlight */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                        Official Clock-In Time
                      </span>
                      <span className="text-[10px] font-mono bg-[#FFEBEE] text-[#B71C1C] border border-red-200 px-2 py-0.5 rounded font-bold">
                        Verified
                      </span>
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#D32F2F]">
                        {new Date(todayReport.officialClockInTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {todayReport.officialClockInTime.substring(0, 10)}
                      </span>
                    </div>

                    {/* Sync Time Details */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-mono">
                      <span>Transmission:</span>
                      <span className={`font-semibold ${
                        todayReport.submissionType === 'OFFLINE_SYNC' 
                          ? 'text-amber-700' 
                          : 'text-emerald-700'
                      }`}>
                        {todayReport.submissionType === 'OFFLINE_SYNC' ? '⚡ Offline Sync' : '● Direct Cellular'}
                      </span>
                    </div>
                    
                    {todayReport.submissionType === 'OFFLINE_SYNC' && (
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                        <span>Server Sync Time:</span>
                        <span className="text-slate-900 font-medium">
                          {todayReport.serverSyncedAt.includes('T')
                            ? new Date(todayReport.serverSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : todayReport.serverSyncedAt}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* GPS Location & Map link */}
                  <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#D32F2F] shrink-0" />
                      <div>
                        <span className="text-slate-900 block font-semibold">
                          {todayReport.latitude.toFixed(4)}, {todayReport.longitude.toFixed(4)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Accuracy: ±{todayReport.locationAccuracyMeters}m
                        </span>
                      </div>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${todayReport.latitude},${todayReport.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#D32F2F] hover:text-[#B71C1C] text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* 4 Photo thumbnails */}
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block mb-2">
                      Verified Safety Photos ({todayReport.photos.length})
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {todayReport.photos.map((photo, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative">
                          <img src={photo.dataUrl} alt={photo.photoType} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-bold text-center text-white py-0.5">
                            {photo.photoType.replace('_', ' ').substring(0, 7)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* EHS Checklist Completed confirmation */}
                  <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/80 flex items-center justify-between text-xs">
                    <span className="text-emerald-900 font-medium">EHS Compliance:</span>
                    <span className="text-emerald-800 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      5 / 5 Mandatory Passed
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* NOT CLOCKED IN STATE - PROMINENT, MODERN INDUSTRIAL CLOCK IN ACTION */
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                
                {/* Hero Card */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-6 text-center space-y-5 shadow-xs">
                  
                  {/* Digital Clock Telemetry */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                      Live Field Station Clock
                    </span>
                    <div className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center justify-center gap-2">
                      <span>Shift Target: <strong>{currentUser.customExpectedStartTime || settings?.defaultExpectedStartTime || '08:00'} AM</strong></span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[#D32F2F] font-semibold">5 min grace</span>
                    </div>
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFEBEE] text-[#B71C1C] border border-red-200 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F] animate-pulse" />
                      <span>Clock-In Pending</span>
                    </div>
                    <h3 className="font-heading font-extrabold text-lg text-slate-900">
                      Daily Arrival & EHS Verification
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      Complete 4 safety inspection photos (PPE, Tools, Vehicle, Ladder) and daily checklist to record arrival.
                    </p>
                  </div>

                  {/* PROMINENT ACTION BUTTON */}
                  <button
                    onClick={() => setIsWizardOpen(true)}
                    className="w-full py-3.5 px-5 rounded-xl bg-[#D32F2F] hover:bg-[#B71C1C] active:bg-[#991B1B] text-white shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 active:scale-[0.99] transition-all flex items-center justify-between gap-3 cursor-pointer group border border-red-400/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D32F2F] focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0">
                        <HardHat className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm sm:text-base block leading-tight">
                          Start Daily Clock-In
                        </span>
                        <span className="text-[11px] text-red-100 font-medium block mt-0.5">
                          4 Stamped Photos • GPS • Safety Audit
                        </span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </button>

                  <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] text-slate-500 pt-1">
                    <span className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md font-medium">Camera Stamped</span>
                    <span className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md font-medium">GPS Authenticated</span>
                    <span className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md font-medium">Offline Safe</span>
                  </div>
                </div>

                {/* Offline note */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#D32F2F] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-900 font-semibold block">Remote Field Dead-Zone Support</span>
                    <span className="text-slate-500">If cell service drops, clock-in completes normally with cryptographic device timestamps and syncs automatically when signal is restored.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Modern Navigation Bar - Material 3 Style */}
        <div className="px-4 py-2 bg-white border-t border-slate-200/80 flex items-center justify-around text-xs select-none">
          <button
            onClick={() => {
              setIsWizardOpen(false);
              setMobileTab('tech');
            }}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D32F2F] ${
              mobileTab === 'tech' && !isWizardOpen
                ? 'bg-[#FFEBEE] text-[#B71C1C] font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="text-[10px]">Clock-In</span>
          </button>

          <button
            onClick={() => {
              setMobileTab('tech');
              setIsWizardOpen(true);
            }}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D32F2F] ${
              isWizardOpen
                ? 'bg-[#FFEBEE] text-[#B71C1C] font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px]">EHS Wizard</span>
          </button>

          <button
            onClick={() => {
              setIsWizardOpen(false);
              setMobileTab('admin');
            }}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D32F2F] ${
              mobileTab === 'admin'
                ? 'bg-[#FFEBEE] text-[#B71C1C] font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-[10px]">Admin View</span>
          </button>
        </div>
      </div>
    </div>
  );
};
