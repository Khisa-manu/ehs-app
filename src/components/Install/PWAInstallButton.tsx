import React, { useState } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { ApkInstallModal } from './ApkInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '',
  variant = 'compact'
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  const handleAction = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleAction}
        id="btn-install-apk"
        className={`flex items-center gap-1.5 font-semibold text-xs transition rounded-lg shadow-xs ${
          isInstalled
            ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-sm'
        } ${variant === 'full' ? 'w-full py-2.5 px-4 justify-center' : 'py-1.5 px-3'} ${className}`}
        title="Install as Android App / Get APK"
      >
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <span>{isInstalled ? 'App Installed (APK)' : 'Install App / APK'}</span>
      </button>

      <ApkInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
