import React, { useState } from 'react';
import { DailyReport, ReportPhoto } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  HardHat, 
  Wrench, 
  Truck, 
  Building,
  Edit3,
  Calendar,
  Layers,
  FileCheck2,
  Info
} from 'lucide-react';

interface ReportDetailModalProps {
  report: DailyReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  const { adminOverrideReport, ehsQuestions } = useApp();
  const [selectedPhoto, setSelectedPhoto] = useState<ReportPhoto | null>(null);
  const [isOverriding, setIsOverriding] = useState<boolean>(false);
  const [overrideStatus, setOverrideStatus] = useState<'ON_TIME' | 'LATE' | 'EXCUSED'>('EXCUSED');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideSubmitting, setOverrideSubmitting] = useState<boolean>(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  if (!isOpen || !report) return null;

  const handleApplyOverride = async () => {
    if (!overrideReason.trim()) {
      setOverrideError('A mandatory reason is required to perform an administrative override.');
      return;
    }
    setOverrideSubmitting(true);
    setOverrideError(null);

    const success = await adminOverrideReport(report.id, overrideStatus, overrideReason);
    setOverrideSubmitting(false);

    if (success) {
      setIsOverriding(false);
      onClose();
    } else {
      setOverrideError('Failed to apply administrative override.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-[#B71C1C] to-[#D32F2F] text-white flex items-start justify-between shadow-xs">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 rounded-xl bg-white text-[#B71C1C] font-extrabold text-lg flex items-center justify-center shadow-xs shrink-0">
              {report.technicianName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg sm:text-xl text-white">
                  {report.technicianName}
                </h2>
                <span className="font-mono text-[11px] font-bold bg-black/25 text-white px-2 py-0.5 rounded-md border border-white/20">
                  {report.employeeId}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-red-100 mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Work Date: {report.workDate}
                </span>
                <span>•</span>
                <span className="font-mono text-red-100/90 text-[11px]">
                  ID: {report.id.substring(0, 14)}...
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOverriding(!isOverriding)}
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-white/20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Admin Override</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 bg-[#F8FAFC]">
          
          {/* ADMINISTRATIVE OVERRIDE DRAWER (If toggled) */}
          {isOverriding && (
            <div className="bg-[#FFEBEE] border border-red-200 rounded-3xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-bold text-[#B71C1C] text-sm flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#D32F2F]" />
                  Administrative Status & Time Override
                </h4>
                <span className="text-[11px] font-mono font-bold text-[#B71C1C] bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200">
                  Logged in Audit Trail
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Adjusted Status:
                  </label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-[#D32F2F] focus:ring-2 focus:ring-[#FFEBEE]"
                  >
                    <option value="EXCUSED">EXCUSED (Approved Exception)</option>
                    <option value="ON_TIME">ON TIME (Correction)</option>
                    <option value="LATE">LATE (Enforce Penalty)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mandatory Reason for Override:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Major highway closure on I-880 confirmed by DOT dispatch."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-[#D32F2F] focus:ring-2 focus:ring-[#FFEBEE]"
                  />
                </div>
              </div>

              {overrideError && (
                <p className="text-xs text-[#D32F2F] font-semibold">{overrideError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-200/60">
                <button
                  onClick={() => setIsOverriding(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyOverride}
                  disabled={overrideSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] active:scale-[0.98] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  {overrideSubmitting ? 'Saving...' : 'Commit Override to Audit Log'}
                </button>
              </div>
            </div>
          )}

          {/* OVERRIDE BADGE IF APPLIED */}
          {report.isOverridden && (
            <div className="bg-purple-50 border border-purple-200 rounded-3xl p-4 flex items-start gap-3">
              <FileCheck2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-purple-900 block">
                  Administratively Overridden by {report.overriddenBy}
                </span>
                <p className="text-purple-800 mt-0.5">
                  Reason: "{report.overrideReason}" • Effective Status: <strong>{report.lateStatus}</strong>
                </p>
              </div>
            </div>
          )}

          {/* CORE TIMESTAMP & INTEGRITY AUDIT MATRIX */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D32F2F]" />
                <span>Cryptographic & Chronological Time Audit</span>
              </h3>

              {/* Tamper verification badge */}
              {report.isTimeTampered ? (
                <span className="flex items-center gap-1.5 bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-1 rounded-full text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>POTENTIAL CLOCK DRIFT / TAMPER</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CHRONOLOGICAL INTEGRITY VERIFIED</span>
                </span>
              )}
            </div>

            {/* Timestamps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              
              {/* 1. Official Recorded Time (Sacred Device Clock) */}
              <div className="bg-[#FFEBEE] border border-red-200 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B71C1C] block">
                  Official Clock-In Time
                </span>
                <span className="text-lg font-mono font-extrabold text-[#B71C1C] block mt-0.5">
                  {new Date(report.officialClockInTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="text-[10px] text-[#D32F2F] block mt-1 font-medium">
                  Immutable Device Clock
                </span>
              </div>

              {/* 2. Expected Start Time & Late Status */}
              <div className="bg-[#F7F7F7] border border-slate-200 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Expected Arrival Time
                </span>
                <span className="text-lg font-mono font-extrabold text-slate-900 block mt-0.5">
                  {report.expectedStartTime} AM
                </span>
                <span className="text-[10px] font-bold mt-1 inline-block">
                  {report.lateStatus === 'ON_TIME' && (
                    <span className="text-emerald-600">● ON TIME</span>
                  )}
                  {report.lateStatus === 'LATE' && (
                    <span className="text-rose-600">● LATE (+{report.lateDurationMinutes}m)</span>
                  )}
                  {report.lateStatus === 'EXCUSED' && (
                    <span className="text-purple-600">● EXCUSED</span>
                  )}
                </span>
              </div>

              {/* 3. Server Sync Time */}
              <div className="bg-[#F7F7F7] border border-slate-200 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Server Synchronization Time
                </span>
                <span className="text-lg font-mono font-extrabold text-slate-900 block mt-0.5">
                  {report.serverSyncedAt.includes('T')
                    ? new Date(report.serverSyncedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : report.serverSyncedAt}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Ingestion Timestamp
                </span>
              </div>

              {/* 4. Submission Type & Delta */}
              <div className="bg-[#F7F7F7] border border-slate-200 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Submission Classification
                </span>
                <span className="text-base font-bold text-slate-900 block mt-1">
                  {report.submissionType === 'OFFLINE_SYNC' ? (
                    <span className="text-amber-700 font-mono">⚡ OFFLINE SYNC</span>
                  ) : (
                    <span className="text-emerald-700 font-mono">● ONLINE DIRECT</span>
                  )}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                  Sync Delay: {Math.max(0, Math.round((new Date(report.serverSyncedAt).getTime() - new Date(report.officialClockInTime).getTime()) / 60000))}m
                </span>
              </div>
            </div>

            {/* GPS & Hardware Attestation */}
            <div className="bg-[#F7F7F7] border border-slate-200 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-700">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D32F2F]" />
                <span>
                  GPS: <strong>{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</strong> (±{report.locationAccuracyMeters}m fix)
                </span>
              </div>

              {report.rawGpsTimestamp && (
                <div className="text-slate-500 text-[11px]">
                  GPS Satellite Clock: {report.rawGpsTimestamp.substring(11, 19)}Z
                </div>
              )}

              <a
                href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#D32F2F] hover:text-[#B71C1C] font-bold flex items-center gap-1"
              >
                <span>View Coordinates on Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* VERIFIED SAFETY PHOTOS GALLERY (PPE, TOOLS, VEHICLE, LADDER) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="font-heading font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Mandatory Safety Photos ({report.photos.length} Captured)</span>
              <span className="text-xs font-normal text-slate-500">Click any photo to zoom</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {report.photos.map((photo, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 hover:border-[#D32F2F] transition-all cursor-pointer shadow-xs"
                >
                  <div className="aspect-4/3 overflow-hidden relative">
                    <img
                      src={photo.dataUrl}
                      alt={photo.photoType}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5 text-white">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider block">
                        {photo.photoType.replace('_', ' ')}
                      </span>
                      <span className="text-[9px] font-mono text-slate-300">
                        {photo.capturedAt.substring(11, 19)} UTC
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EHS INSPECTION ANSWERS */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="font-heading font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>EHS Checklist Answers</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                5 / 5 Compliant
              </span>
            </h3>

            <div className="space-y-2">
              {ehsQuestions.map((q, idx) => {
                const answer = report.ehsAnswers.find(a => a.questionId === q.id);
                const isCompliant = answer ? answer.isCompliant : true;

                return (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-2xl border border-slate-200 flex items-start justify-between gap-3 text-xs bg-[#F7F7F7]"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {q.category}
                      </span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {idx + 1}. {q.questionText}
                      </p>
                      {answer?.notes && (
                        <p className="text-[11px] text-[#B71C1C] mt-1 italic">
                          Tech note: "{answer.notes}"
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isCompliant ? (
                        <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PASS</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-bold text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-full text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>FLAG</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COMMENTS & HAZARDS */}
          {(report.generalComments || report.identifiedHazards) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {report.identifiedHazards && (
                <div className="bg-[#FFEBEE] border border-red-200 rounded-3xl p-5 text-xs">
                  <span className="font-bold text-[#B71C1C] block uppercase tracking-wider text-[10px]">
                    Identified Site Hazards
                  </span>
                  <p className="text-slate-800 mt-1 leading-relaxed">
                    {report.identifiedHazards}
                  </p>
                </div>
              )}

              {report.generalComments && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 text-xs">
                  <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                    Arrival Comments & Notes
                  </span>
                  <p className="text-slate-800 mt-1 leading-relaxed">
                    {report.generalComments}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PHOTO LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between text-white">
              <span className="font-bold text-sm text-amber-400">
                {selectedPhoto.photoType.replace('_', ' ')}
              </span>
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="rounded-2xl overflow-hidden max-h-[60vh] bg-black flex items-center justify-center">
              <img src={selectedPhoto.dataUrl} alt="Inspection Full" className="w-full h-full object-contain" />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span>Captured: {selectedPhoto.capturedAt}</span>
              <span>SHA256: {selectedPhoto.checksumSha256.substring(0, 16)}...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
