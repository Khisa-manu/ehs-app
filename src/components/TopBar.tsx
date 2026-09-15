import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Smartphone, 
  LayoutDashboard, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  RotateCcw,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Clock,
  LogOut
} from 'lucide-react';
import { PWAInstallButton } from './Install/PWAInstallButton';

export const TopBar: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    currentUser, 
    setCurrentUser, 
    allUsers, 
    isNetworkOnline, 
    toggleNetworkSimulation,
    syncQueue,
    isSyncing,
    triggerSync,
    resetDemoData,
    logout
  } = useApp();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200/80 shadow-xs transition-colors">
      {/* Precision Brand Accent Strip */}
      <div className="h-[2px] w-full bg-[#D32F2F]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-16">
          
          {/* Logo & Product Identity */}
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D32F2F] text-white flex items-center justify-center font-extrabold text-sm tracking-tight shadow-xs">
                SE
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                    Spectrum Engineering
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-mono uppercase font-bold tracking-wider bg-[#FFEBEE] text-[#B71C1C] border border-red-200 px-2 py-0.5 rounded-md">
                    EHS
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium block leading-none mt-0.5">
                  Field Operations & Safety Intelligence
                </span>
              </div>
            </div>

            {/* View Switcher: Segmented Control */}
            <div className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setActiveView('mobile_tech')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'mobile_tech'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-[#D32F2F]" />
                <span>Field Tech Mobile</span>
                {syncQueue.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>

              <button
                onClick={() => setActiveView('admin_dashboard')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'admin_dashboard'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#D32F2F]" />
                <span>Admin Operations</span>
              </button>
            </div>
          </div>

          {/* Right Controls: Offline Simulator, Sync Queue, Persona, Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* OFFLINE NETWORK SIMULATOR TOGGLE */}
            <button
              onClick={toggleNetworkSimulation}
              title={isNetworkOnline ? 'Click to simulate offline field dead zone' : 'Click to restore cellular connectivity'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isNetworkOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/70'
                  : 'bg-[#FFEBEE] text-[#B71C1C] border-red-200 font-bold shadow-xs'
              }`}
            >
              {isNetworkOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden xl:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-[#D32F2F]" />
                  <span className="font-bold text-[#B71C1C] text-[11px]">OFFLINE</span>
                </>
              )}
            </button>

            {/* Offline Sync Queue indicator */}
            {syncQueue.length > 0 && (
              <button
                onClick={triggerSync}
                disabled={!isNetworkOnline || isSyncing}
                title="Pending offline reports queued in local storage"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                  isNetworkOnline
                    ? 'bg-amber-50 text-amber-900 border-amber-200/80 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-500 border-slate-200 opacity-80 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-600' : 'text-amber-600'}`} />
                <span className="hidden sm:inline">{syncQueue.length} Queued</span>
                <span className="sm:hidden">{syncQueue.length}</span>
              </button>
            )}

            {/* Persona Switcher Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const selected = allUsers.find(u => u.id === e.target.value);
                  if (selected) {
                    setCurrentUser(selected);
                    if (selected.role === 'ADMIN' || selected.role === 'SUPER_ADMIN') {
                      setActiveView('admin_dashboard');
                    } else {
                      setActiveView('mobile_tech');
                    }
                  }
                }}
                className="bg-transparent text-slate-800 font-medium text-xs focus:outline-hidden cursor-pointer max-w-[130px] sm:max-w-none truncate"
              >
                <optgroup label="Field Technicians">
                  {allUsers
                    .filter(u => u.role === 'TECHNICIAN')
                    .map(u => (
                      <option key={u.id} value={u.id} className="text-slate-900">
                        {u.fullName} ({u.employeeId})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="EHS Management">
                  {allUsers
                    .filter(u => u.role !== 'TECHNICIAN')
                    .map(u => (
                      <option key={u.id} value={u.id} className="text-slate-900">
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* PWA / Android APK Launch Button */}
            <PWAInstallButton />

            {/* Reset Demo State */}
            <button
              onClick={resetDemoData}
              title="Reset system state to clean seed data"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer hidden sm:block"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Log Out Button */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Log Out of Spectrum Engineering EHS"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-bar toggle */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-200/80 text-xs">
          <button
            onClick={() => setActiveView('mobile_tech')}
            className={`flex items-center gap-1.5 py-1 px-3 rounded-lg font-semibold cursor-pointer transition-all ${
              activeView === 'mobile_tech' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#D32F2F]" />
            <span>Field Tech</span>
          </button>
          <button
            onClick={() => setActiveView('admin_dashboard')}
            className={`flex items-center gap-1.5 py-1 px-3 rounded-lg font-semibold cursor-pointer transition-all ${
              activeView === 'admin_dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-[#D32F2F]" />
            <span>Admin Console</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal - Modern Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFEBEE] text-[#D32F2F] flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Log Out of Spectrum EHS?</h3>
                <p className="text-xs text-slate-500 mt-0.5">End active session for {currentUser.fullName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to log out? Any queued offline reports and local timecards will remain securely stored on this device.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#D32F2F] hover:bg-[#B71C1C] active:bg-[#991B1B] transition-colors shadow-xs cursor-pointer"
              >
                Confirm Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
