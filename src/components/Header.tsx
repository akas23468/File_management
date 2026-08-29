import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Wifi, 
  WifiOff, 
  Menu
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    currentUser, 
    activeView, 
    isUndergroundModeActive,
    toggleSimulateOffline,
    toggleMobileNav,
    cachedDocumentIds,
    offlineStorageSizeBytes,
    setActiveView
  } = useApp();

  const viewTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: currentUser.role === 'admin' ? 'Executive Governance Dashboard' : 'Officer Workstation Dashboard',
      subtitle: currentUser.role === 'admin' 
        ? 'Subsidiary-wide document lifecycle, pending approvals, and AI knowledge metrics'
        : `Personalized overview for ${currentUser.subsidiary} mining & exploration operations`
    },
    knowledge: {
      title: 'Knowledge Center',
      subtitle: 'Official governed document repository, version lineage, and extraction pipeline'
    },
    'ai-assistant': {
      title: 'Source-Grounded AI Assistant',
      subtitle: 'Ask technical questions & retrieve historical precedents strictly cited from approved records'
    },
    'my-updates': {
      title: 'My Document Updates & Submissions',
      subtitle: 'Track review statuses, change requests, and approval notes from Central Directorate'
    },
    reports: {
      title: 'Automated Report Generator',
      subtitle: 'Compile auditable statutory briefings and production variance summaries with inline citations'
    },
    'approval-queue': {
      title: 'Central Approval & Governance Queue',
      subtitle: 'Review technical revisions, side-by-side metric diffs, and approve re-indexing'
    },
    'ai-insights': {
      title: 'AI Knowledge Insights & Topic Trends',
      subtitle: 'Organizational knowledge coverage, keyword clusters, and historical inquiry patterns'
    },
    'audit-trail': {
      title: 'Statutory Audit Trail',
      subtitle: 'Immutable record of document modifications, approvals, and AI queries'
    },
    settings: {
      title: 'Governance & Access Configuration',
      subtitle: 'Role permissions matrix, subsidiary mappings, and knowledge retention policies'
    }
  };

  const currentViewMeta = viewTitles[activeView] || { title: 'MineMind AI Platform', subtitle: 'From scattered reports to smarter mining decision' };
  const sizeMb = ((offlineStorageSizeBytes || 0) / (1024 * 1024)).toFixed(1);

  return (
    <header id="minemind-header" className="bg-[#FFFFFF] border-b border-[#E4E0D6] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs sticky top-0 z-20">
      {/* Mobile Hamburger & View Title */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <button
          type="button"
          id="btn-toggle-mobile-menu"
          onClick={toggleMobileNav}
          className="md:hidden p-2 rounded-lg text-[#141C2B] hover:bg-[#F1EDE4] border border-[#E4E0D6] transition-colors cursor-pointer flex-shrink-0"
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-[#141C2B]" />
        </button>

        <div className="min-w-0">
          <h1 className="font-serif font-bold text-base sm:text-lg text-[#141C2B] tracking-tight truncate flex items-center gap-2">
            <span className="truncate">{currentViewMeta.title}</span>
            {isUndergroundModeActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                <WifiOff className="w-2.5 h-2.5 text-[#D97706]" />
                <span>OFFLINE</span>
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Top Bar Controls (Offline Mode, User/Role Pill) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Underground Mode Switch */}
        <button
          id="btn-toggle-underground-mode"
          onClick={toggleSimulateOffline}
          title={isUndergroundModeActive 
            ? `Underground Mode active (IndexedDB storage: ${cachedDocumentIds.length} files, ${sizeMb} MB). Click to return to Cloud.` 
            : `Online Cloud Mode. Click to simulate low-connectivity underground mine pit (${cachedDocumentIds.length} files cached).`
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isUndergroundModeActive
              ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] hover:bg-[#FDE68A]'
              : 'bg-[#FAF8F3] text-[#141C2B] border-[#E4E0D6] hover:bg-[#EFEBE2]'
          }`}
        >
          {isUndergroundModeActive ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-[#D97706]" />
              <span className="font-semibold hidden sm:inline">Underground Pit</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-[#16A34A]" />
              <span className="font-semibold hidden sm:inline">Online</span>
            </>
          )}
        </button>

        {/* 3. Current User & Role Pill */}
        <div 
          onClick={() => setActiveView('settings')}
          className="flex items-center gap-2 bg-[#141C2B] text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-[#1E293B] transition-colors shadow-2xs"
          title={`Logged in as ${currentUser.name} (${currentUser.role.toUpperCase()}) - ${currentUser.subsidiary}. Click to manage settings.`}
        >
          <div className="w-5 h-5 rounded-full bg-[#C8892E] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
            {currentUser.name.charAt(0)}
          </div>
          <div className="hidden sm:block text-left">
            <div className="font-bold text-[11px] leading-tight truncate max-w-[110px]">{currentUser.name}</div>
            <div className="text-[9px] font-mono text-[#94A3B8] uppercase leading-none">
              {currentUser.role === 'admin' ? 'Central Admin' : `${currentUser.subsidiary} Officer`}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
