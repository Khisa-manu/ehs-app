import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import { 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Smartphone, 
  Building2,
  HardHat
} from 'lucide-react';

export const WebLoginScreen: React.FC = () => {
  const { allUsers, loginWithCredentials } = useApp();
  const [badgeId, setBadgeId] = useState('SE-7842');
  const [pin, setPin] = useState('7842');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await loginWithCredentials(badgeId, pin);
    if (!res.success) {
      setError(res.error || 'Authentication failed. Please verify your badge ID and PIN.');
    }
    setIsLoading(false);
  };

  const handleQuickSelect = async (user: User) => {
    const cred = user.employeeId || user.email;
    setBadgeId(cred);
    setPin('7842');
    setError(null);
    setIsLoading(true);

    const res = await loginWithCredentials(cred, '7842');
    if (!res.success) {
      setError(res.error || 'Quick login failed');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-12 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#D32F2F] text-white shadow-xs font-extrabold text-lg tracking-tight">
            SE
          </div>
          <div>
            <div className="inline-block text-[11px] font-mono uppercase font-bold tracking-wider bg-[#FFEBEE] text-[#B71C1C] border border-red-200 px-2.5 py-0.5 rounded-md mb-1.5">
              Field Safety & Operations
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Spectrum Engineering
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              Field Technician Clock-In, Hazard Audit & Safety Portal
            </p>
          </div>
        </div>

        {/* Credentials Form Card - Clean White Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D32F2F]" />
              <span>Personnel Sign In</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your Spectrum employee badge ID or work email
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#FFEBEE] border border-red-200 text-[#B71C1C] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#D32F2F] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Employee Badge ID or Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  placeholder="e.g. SE-7842 or c.mendez@spectrum-ehs.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Security PIN / Password</span>
                <span className="text-[11px] text-slate-400 font-mono">Demo: 7842</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#D32F2F] focus:bg-white focus:ring-2 focus:ring-[#FFEBEE] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#D32F2F] hover:bg-[#B71C1C] active:bg-[#991B1B] text-white font-bold rounded-xl text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Real Authentication & Offline Notice */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Bcrypt PIN + HS256 JWT</span>
            </div>
            <span className="text-[10px] text-slate-400">Offline fail-safe enabled</span>
          </div>
        </div>

        {/* Fast Select Demo Profiles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
              Quick Personnel Sign-In
            </span>
            <span className="text-[10px] text-slate-400 font-mono">1-Click Demo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allUsers.slice(0, 4).map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleQuickSelect(user)}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-[#D32F2F] hover:shadow-xs transition-all text-left group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FFEBEE] text-[#D32F2F] group-hover:bg-[#D32F2F] group-hover:text-white flex items-center justify-center font-bold text-xs transition-colors shrink-0">
                  {user.role === 'SUPER_ADMIN' ? (
                    <Building2 className="w-3.5 h-3.5" />
                  ) : (
                    <HardHat className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {user.employeeId || user.role} • {user.role === 'SUPER_ADMIN' ? 'EHS Admin' : 'Field Tech'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
