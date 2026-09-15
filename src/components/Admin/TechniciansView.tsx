import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import { 
  UserCheck, 
  UserPlus, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search,
  KeyRound,
  X,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export const TechniciansView: React.FC = () => {
  const { allUsers, createTechnician, updateTechnician, deleteTechnician, settings, resetTechnicianPin } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingTech, setDeletingTech] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // PIN Reset State
  const [pinResetTech, setPinResetTech] = useState<User | null>(null);
  const [newPinValue, setNewPinValue] = useState('7842');
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [pinStatusMessage, setPinStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // New Tech Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customStartTime, setCustomStartTime] = useState('');
  const [initialPin, setInitialPin] = useState('7842');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const technicians = allUsers.filter(u => u.role === 'TECHNICIAN');
  const filteredTechs = technicians.filter(t => 
    t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.employeeId && t.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !employeeId) {
      setFormError('Name, email, and employee ID are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const success = await createTechnician({
      fullName,
      email,
      employeeId,
      phoneNumber: phoneNumber || undefined,
      customExpectedStartTime: customStartTime || undefined,
      pin: initialPin || '7842',
    });

    setIsSubmitting(false);

    if (success) {
      setIsAddModalOpen(false);
      setFullName('');
      setEmail('');
      setEmployeeId('');
      setPhoneNumber('');
      setCustomStartTime('');
      setInitialPin('7842');
    } else {
      setFormError('Failed to create technician record.');
    }
  };

  const handleConfirmResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinResetTech) return;
    setIsResettingPin(true);
    setPinStatusMessage(null);

    const res = await resetTechnicianPin(pinResetTech.id, newPinValue);
    setIsResettingPin(false);
    if (res.success) {
      setPinStatusMessage({
        type: 'success',
        text: `PIN successfully reset to "${newPinValue}" for ${pinResetTech.fullName}. Encrypted with Bcrypt.`,
      });
      setTimeout(() => {
        setPinResetTech(null);
        setPinStatusMessage(null);
        setNewPinValue('7842');
      }, 2000);
    } else {
      setPinStatusMessage({
        type: 'error',
        text: res.error || 'Failed to reset technician PIN.',
      });
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search technician by name or EMP ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-1 focus:ring-[#FFEBEE] transition-all"
          />
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Technician</span>
        </button>
      </div>

      {/* Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTechs.map((tech) => (
          <div
            key={tech.id}
            className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFEBEE] text-[#B71C1C] border border-red-200/80 font-bold flex items-center justify-center text-xs">
                    {tech.fullName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-tight">
                      {tech.fullName}
                    </h4>
                    <span className="font-mono text-[11px] font-bold text-[#B71C1C] bg-[#FFEBEE] border border-red-200 px-1.5 py-0.2 rounded inline-block mt-0.5">
                      {tech.employeeId || 'NO EMP ID'}
                    </span>
                  </div>
                </div>

                {/* Active status indicator */}
                <button
                  onClick={() => updateTechnician(tech.id, { isActive: !tech.isActive })}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                    tech.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                  title="Click to toggle active roster status"
                >
                  {tech.isActive ? 'Active' : 'Suspended'}
                </button>
              </div>

              {/* Contact and schedule details */}
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tech.email}</span>
                </div>
                {tech.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tech.phoneNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Clock className="w-3.5 h-3.5 text-[#D32F2F]" />
                  <span>
                    Expected Start:{' '}
                    <strong className="font-mono text-slate-900">
                      {tech.customExpectedStartTime || settings?.defaultExpectedStartTime || '08:00'} AM
                    </strong>
                    {tech.customExpectedStartTime ? ' (Custom Shift)' : ' (Default)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                Added: {tech.createdAt.substring(0, 10)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPinResetTech(tech);
                    setNewPinValue('7842');
                    setPinStatusMessage(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100"
                  title="Reset technician security PIN"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Reset PIN</span>
                </button>
                <button
                  onClick={() => setDeletingTech(tech)}
                  className="text-[#D32F2F] hover:text-[#B71C1C] text-[11px] font-bold flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-[#FFEBEE]"
                  title="Remove technician from active roster"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* REMOVE TECHNICIAN CONFIRMATION MODAL */}
      {deletingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFEBEE] text-[#D32F2F] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Remove Field Technician?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-800">{deletingTech.fullName}</strong> ({deletingTech.employeeId})? This will immediately revoke their mobile app badge access and remove them from active field operations.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingTech(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  await deleteTechnician(deletingTech.id);
                  setIsDeleting(false);
                  setDeletingTech(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TECHNICIAN MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Onboard New Field Technician
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTechnician} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. david.vance@fieldpulse.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="EMP-1120"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-3 py-2.5 font-mono text-slate-900 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    placeholder="(415) 555-0142"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Expected Start Time
                  </label>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-3 py-2.5 font-mono text-slate-900 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE]"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Blank for default (08:00 AM)
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Initial Security PIN *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="7842"
                    value={initialPin}
                    onChange={(e) => setInitialPin(e.target.value)}
                    className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-3 py-2.5 font-mono text-slate-900 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE]"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Hashed with Bcrypt (Default: 7842)
                  </span>
                </div>
              </div>

              {formError && (
                <p className="text-[#D32F2F] font-semibold">{formError}</p>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Create Technician'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PIN MODAL */}
      {pinResetTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFEBEE] text-[#D32F2F] flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Reset Technician PIN
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Set a new access PIN for <strong className="text-slate-800">{pinResetTech.fullName}</strong> ({pinResetTech.employeeId}). The PIN is securely hashed using Bcrypt.
              </p>
            </div>

            <form onSubmit={handleConfirmResetPin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Security PIN
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter 4-8 digit PIN"
                  value={newPinValue}
                  onChange={(e) => setNewPinValue(e.target.value)}
                  className="w-full bg-[#F7F7F7] border border-slate-200 rounded-xl px-3 py-2.5 font-mono text-center tracking-widest text-lg font-bold text-slate-900 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE]"
                />
              </div>

              {pinStatusMessage && (
                <div className={`p-2.5 rounded-xl text-xs font-semibold ${pinStatusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {pinStatusMessage.text}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isResettingPin}
                  onClick={() => {
                    setPinResetTech(null);
                    setPinStatusMessage(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPin}
                  className="px-5 py-2 rounded-xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isResettingPin ? 'Updating...' : 'Save New PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
