import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DailyReport } from '../../types';
import { ReportsTable } from './ReportsTable';
import { TechniciansView } from './TechniciansView';
import { SettingsView } from './SettingsView';
import { AuditLogsView } from './AuditLogsView';
import { ReportDetailModal } from './ReportDetailModal';
import { 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  WifiOff, 
  Clock, 
  FileText, 
  Sliders, 
  ShieldAlert,
  Download,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    adminTab, 
    setAdminTab, 
    summary, 
    syncQueue, 
    refreshDashboard 
  } = useApp();

  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleSelectReport = (report: DailyReport) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total Techs */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
            Roster Techs
          </span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {summary?.totalTechnicians ?? 3}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Active</span>
          </div>
        </div>

        {/* Clocked In Today */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
            Clocked In
          </span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {summary?.clockedIn ?? 0}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Today</span>
          </div>
        </div>

        {/* On-Time Arrivals */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 block">
            On-Time
          </span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-mono font-bold text-emerald-700">
              {summary?.onTime ?? 0}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Verified</span>
          </div>
        </div>

        {/* Late Arrivals */}
        <div className="bg-[#FFEBEE]/60 border border-red-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B71C1C] block">
            Late Arrivals
          </span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-mono font-bold text-[#D32F2F]">
              {summary?.late ?? 0}
            </span>
            <span className="text-[11px] text-[#B71C1C] font-medium">&gt; 5m grace</span>
          </div>
        </div>

        {/* Offline-Synced Reports */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 block">
            Offline Synced
          </span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-mono font-bold text-amber-700">
              {summary?.offlineSynced ?? 0}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">Attested</span>
          </div>
        </div>

        {/* Pending Sync in Local Queue */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
            Client Queue
          </span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className={`text-2xl font-mono font-bold ${syncQueue.length > 0 ? 'text-[#D32F2F] animate-pulse' : 'text-slate-700'}`}>
              {syncQueue.length}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Awaiting</span>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setAdminTab('reports')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            adminTab === 'reports'
              ? 'bg-[#D32F2F] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Daily Reports</span>
        </button>

        <button
          onClick={() => setAdminTab('technicians')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            adminTab === 'technicians'
              ? 'bg-[#D32F2F] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Technician Roster</span>
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            adminTab === 'settings'
              ? 'bg-[#D32F2F] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Shift Rules & Settings</span>
        </button>

        <button
          onClick={() => setAdminTab('audit_logs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            adminTab === 'audit_logs'
              ? 'bg-[#D32F2F] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Audit Trail</span>
        </button>
      </div>

      {/* ACTIVE TAB CONTENT */}
      <div>
        {adminTab === 'reports' && (
          <ReportsTable onSelectReport={handleSelectReport} />
        )}
        {adminTab === 'technicians' && <TechniciansView />}
        {adminTab === 'settings' && <SettingsView />}
        {adminTab === 'audit_logs' && <AuditLogsView />}
      </div>

      {/* REPORT DOSSIER MODAL */}
      <ReportDetailModal
        report={selectedReport}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedReport(null);
        }}
      />
    </div>
  );
};
