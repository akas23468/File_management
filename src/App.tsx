import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { KnowledgeCenter } from './components/KnowledgeCenter';
import { AiAssistant } from './components/AiAssistant';
import { MyUpdates } from './components/MyUpdates';
import { ReportGenerator } from './components/ReportGenerator';
import { ApprovalQueue } from './components/ApprovalQueue';
import { AiInsights } from './components/AiInsights';
import { AuditTrail } from './components/AuditTrail';
import { SettingsView } from './components/SettingsView';
import { SourceViewerModal } from './components/SourceViewerModal';
import { CompareVersionsModal } from './components/CompareVersionsModal';
import { sounds } from './utils/soundEffects';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isLoggedIn, activeView, setActiveView, logout, currentUser, toastMessage, setToastMessage } = useApp();
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);

  // Initialize Theme and Font Scale on initial mount
  useEffect(() => {
    try {
      const root = document.documentElement;
      const theme = localStorage.getItem('minemind_theme') || 'light';
      root.classList.remove('dark', 'theme-amber', 'theme-contrast');
      if (theme === 'dark') root.classList.add('dark');
      if (theme === 'amber') root.classList.add('theme-amber');
      if (theme === 'contrast') root.classList.add('theme-contrast');

      const fontSize = localStorage.getItem('minemind_font_size') || 'standard';
      root.classList.remove('font-large', 'font-xlarge');
      if (fontSize === 'large') root.classList.add('font-large');
      if (fontSize === 'xlarge') root.classList.add('font-xlarge');

      const compact = localStorage.getItem('minemind_compact_mode') === 'true';
      if (compact) root.classList.add('compact-ui');
    } catch {}
  }, []);

  // Session Protection for authenticated pages
  useEffect(() => {
    let isMounted = true;

    const enforceSessionProtection = async () => {
      if (!isLoggedIn) {
        if (isMounted) setIsVerifyingSession(false);
        return;
      }

      // Check auth type: demo/intranet accounts do not require Supabase GoTrue tokens
      const authType = localStorage.getItem('khanij_auth_type');
      if (authType === 'local' || currentUser?.email?.includes('@cmpdi.co.in') || currentUser?.email?.includes('@secl.gov.in') || currentUser?.id?.startsWith('usr_')) {
        if (isMounted) setIsVerifyingSession(false);
        return;
      }

      if (!isSupabaseConfigured) {
        if (isMounted) setIsVerifyingSession(false);
        return;
      }

      const client = getSupabase();
      if (!client) {
        if (isMounted) setIsVerifyingSession(false);
        return;
      }

      try {
        const { data: { session }, error } = await client.auth.getSession();
        if (error || !session) {
          // If session expired for a Supabase-authenticated account, safely log out
          if (authType === 'supabase') {
            logout();
          }
        }
      } catch (e) {
        console.warn('[Session Guard] Verification error:', e);
      } finally {
        if (isMounted) {
          setIsVerifyingSession(false);
        }
      }
    };

    enforceSessionProtection();

    return () => {
      isMounted = false;
    };
  }, [activeView, isLoggedIn, currentUser, logout]);

  // Play audio chime when toast alerts fire
  useEffect(() => {
    if (toastMessage) {
      if (toastMessage.type === 'success') {
        sounds.playSuccess();
      } else if (toastMessage.type === 'warning') {
        sounds.playAlert();
      } else {
        sounds.playDispatch();
      }
    }
  }, [toastMessage]);

  if (!isLoggedIn || activeView === 'login') {
    return <LoginScreen />;
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return currentUser.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />;
      case 'knowledge':
        return <KnowledgeCenter />;
      case 'ai-assistant':
        return <AiAssistant />;
      case 'my-updates':
        return <MyUpdates />;
      case 'reports':
        return <ReportGenerator />;
      case 'approval-queue':
        return <ApprovalQueue />;
      case 'ai-insights':
        return <AiInsights />;
      case 'audit-trail':
        return <AuditTrail />;
      case 'settings':
        return <SettingsView />;
      default:
        return currentUser.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />;
    }
  };

  return (
    <div id="minemind-root-layout" className="flex h-screen w-full bg-[#F7F5F0] overflow-hidden">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Dynamic View Canvas */}
        <main className="flex-1 overflow-y-auto bg-[#F7F5F0]">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Modals */}
      <SourceViewerModal />
      <CompareVersionsModal />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div className={`p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-3 ${
            toastMessage.type === 'success' 
              ? 'bg-[#141C2B] text-[#F8FAFC] border-[#C8892E]' 
              : toastMessage.type === 'warning'
                ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                : 'bg-[#141C2B] text-white border-[#334155]'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#C8892E] flex-shrink-0" />}
            {toastMessage.type === 'warning' && <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-[#38BDF8] flex-shrink-0" />}
            
            <span className="max-w-xs">{toastMessage.text}</span>

            <button onClick={() => setToastMessage(null)} className="text-[#94A3B8] hover:text-white ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
