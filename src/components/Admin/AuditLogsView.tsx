import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  FileText, 
  Terminal, 
  Filter,
  User,
  ExternalLink
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      
      {/* Header card */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail by actor, action, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-1 focus:ring-[#FFEBEE] transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-slate-700">Immutable Audit Log</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">Timestamp (UTC)</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">Audit Payload & Details</th>
                <th className="py-3.5 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FFEBEE]/30 transition-colors">
                    
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.createdAt.replace('T', ' ').substring(0, 19)}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.actorName}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] font-bold bg-[#FFEBEE] text-[#B71C1C] px-2.5 py-0.5 rounded-full border border-red-200">
                        {log.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                      {log.entityType} #{log.entityId.substring(0, 10)}...
                    </td>

                    {/* Details Payload */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 max-w-md">
                      <div className="truncate" title={JSON.stringify(log.details, null, 2)}>
                        {JSON.stringify(log.details)}
                      </div>
                    </td>

                    {/* IP */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records match the current search term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
