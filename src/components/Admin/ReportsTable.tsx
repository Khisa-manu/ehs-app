import React, { useState, useMemo } from 'react';
import { DailyReport } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Calendar,
  Layers,
  Sparkles,
  WifiOff
} from 'lucide-react';

interface ReportsTableProps {
  onSelectReport: (report: DailyReport) => void;
}

export const ReportsTable: React.FC<ReportsTableProps> = ({ onSelectReport }) => {
  const { reports, allUsers, exportReportsCsv } = useApp();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON_TIME' | 'LATE'>('ALL');
  const [submissionFilter, setSubmissionFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE_SYNC'>('ALL');
  const [selectedTechId, setSelectedTechId] = useState<string>('ALL');

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Date Filter
      if (dateFilter === 'today' && report.workDate !== todayStr) return false;
      if (dateFilter === 'yesterday' && report.workDate !== yesterdayStr) return false;

      // Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ON_TIME' && (report.lateStatus !== 'ON_TIME' && report.lateStatus !== 'EXCUSED')) return false;
        if (statusFilter === 'LATE' && report.lateStatus !== 'LATE') return false;
      }

      // Submission Type Filter
      if (submissionFilter !== 'ALL' && report.submissionType !== submissionFilter) return false;

      // Technician Filter
      if (selectedTechId !== 'ALL' && report.technicianId !== selectedTechId) return false;

      // Search (Name or Employee ID)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = report.technicianName.toLowerCase().includes(term);
        const matchEmp = report.employeeId.toLowerCase().includes(term);
        if (!matchName && !matchEmp) return false;
      }

      return true;
    });
  }, [reports, dateFilter, statusFilter, submissionFilter, selectedTechId, searchTerm, todayStr, yesterdayStr]);

  return (
    <div className="space-y-4">
      
      {/* FILTER CONTROLS BAR */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search technician name or EMP ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-1 focus:ring-[#FFEBEE] transition-all"
            />
          </div>

          {/* Export button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={exportReportsCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          
          {/* Date Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Date Filter
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#D32F2F] cursor-pointer"
            >
              <option value="today">Today ({todayStr})</option>
              <option value="yesterday">Yesterday</option>
              <option value="all">All Dates History</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Arrival Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#D32F2F] cursor-pointer"
            >
              <option value="ALL">All Arrival Statuses</option>
              <option value="ON_TIME">On Time / Excused</option>
              <option value="LATE">Late Only</option>
            </select>
          </div>

          {/* Submission Type */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Submission Channel
            </label>
            <select
              value={submissionFilter}
              onChange={(e) => setSubmissionFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#D32F2F] cursor-pointer"
            >
              <option value="ALL">All Submission Types</option>
              <option value="ONLINE">Online Direct</option>
              <option value="OFFLINE_SYNC">Offline Sync</option>
            </select>
          </div>

          {/* Technician Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Technician
            </label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#D32F2F] cursor-pointer"
            >
              <option value="ALL">All Technicians</option>
              {allUsers
                .filter(u => u.role === 'TECHNICIAN')
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.employeeId})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">Technician</th>
                <th className="py-3.5 px-4">Official Clock-In</th>
                <th className="py-3.5 px-4">Expected</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Sync Time</th>
                <th className="py-3.5 px-4">GPS & Photos</th>
                <th className="py-3.5 px-4 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr 
                    key={report.id}
                    onClick={() => onSelectReport(report)}
                    className="hover:bg-[#FFEBEE]/40 transition-colors cursor-pointer group"
                  >
                    {/* Tech Name & Employee ID */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#FFEBEE] text-[#B71C1C] border border-red-200 font-bold flex items-center justify-center text-xs shrink-0">
                          {report.technicianName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block group-hover:text-[#D32F2F] transition-colors">
                            {report.technicianName}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {report.employeeId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Official Clock-In Time (Device Clock) */}
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-slate-900 block">
                        {new Date(report.officialClockInTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {report.workDate}
                      </span>
                    </td>

                    {/* Expected Start Time */}
                    <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                      {report.expectedStartTime} AM
                    </td>

                    {/* On Time / Late Status */}
                    <td className="py-3.5 px-4">
                      {report.lateStatus === 'ON_TIME' && (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ON TIME</span>
                        </span>
                      )}
                      {report.lateStatus === 'LATE' && (
                        <span className="inline-flex items-center gap-1 font-bold text-[#B71C1C] bg-[#FFEBEE] border border-red-200 px-2.5 py-0.5 rounded-full text-[10px]">
                          <AlertTriangle className="w-3 h-3 text-[#D32F2F]" />
                          <span>LATE (+{report.lateDurationMinutes}m)</span>
                        </span>
                      )}
                      {report.lateStatus === 'EXCUSED' && (
                        <span className="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full text-[10px]">
                          <span>EXCUSED</span>
                        </span>
                      )}
                    </td>

                    {/* Submission Channel */}
                    <td className="py-3.5 px-4 font-mono">
                      {report.submissionType === 'OFFLINE_SYNC' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
                          <WifiOff className="w-3 h-3 text-amber-600" />
                          <span>OFFLINE SYNC</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-800 bg-emerald-50/60 px-2 py-0.5 rounded text-[10px]">
                          <span>Online</span>
                        </span>
                      )}
                    </td>

                    {/* Sync Time */}
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {report.serverSyncedAt.includes('T')
                        ? new Date(report.serverSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : report.serverSyncedAt}
                    </td>

                    {/* GPS & Photo Count */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                          <MapPin className="w-3 h-3 text-[#D32F2F]" />
                          <span>±{report.locationAccuracyMeters}m</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] text-slate-600 font-medium">
                          {report.photos.length} photos
                        </span>
                      </div>
                    </td>

                    {/* View Dossier Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReport(report);
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-[#D32F2F] hover:bg-[#FFEBEE] transition-colors cursor-pointer"
                        title="View Full EHS & Clock-In Dossier"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No reports match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 bg-[#F7F7F7] border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing <strong>{filteredReports.length}</strong> of <strong>{reports.length}</strong> total reports</span>
          <span className="text-[11px] text-slate-500">Official clock-in times are preserved from device attestation</span>
        </div>
      </div>
    </div>
  );
};
