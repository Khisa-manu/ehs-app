import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TopBar } from './components/TopBar';
import { MobileAppShell } from './components/MobileTech/MobileAppShell';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { WebLoginScreen } from './components/Login/WebLoginScreen';

const AppContent: React.FC = () => {
  const { activeView, isLoggedIn } = useApp();

  if (!isLoggedIn) {
    return <WebLoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] text-slate-900 flex flex-col font-sans selection:bg-[#FFEBEE] selection:text-[#B71C1C]">
      <TopBar />
      <main className="flex-1">
        {activeView === 'mobile_tech' ? (
          <MobileAppShell />
        ) : (
          <AdminDashboard />
        )}
      </main>
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
