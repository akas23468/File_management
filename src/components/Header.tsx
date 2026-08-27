import React from 'react';
import { useApp } from '../context/AppContext';
import { Subsidiary } from '../types';
import { 
  Building2, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  FileCheck2, 
  Bell, 
  Filter,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  DownloadCloud,
  HardDrive,
  Check,
  Menu
} from 'lucide-react';

const SUBSIDIARIES: (Subsidiary | 'ALL')[] = [
  'ALL',
  'CMPDI HQ',
  'SECL',
  'BCCL',
  'NCL',
  'CCL',
  'ECL',
  'WCL',
  'MCL',
];

export const Header: React.FC = () => {
  const { 
    currentUser, 
    activeView, 
    selectedSubsidiary, 
    setSelectedSubsidiary,
    knowledgeSearchTerm,
    setKnowledgeSearchTerm,
    setActiveView,
    chunks,
    documents,
    isOnline,
    isSimulatedOffline,
    toggleSimulateOffline,
    isUndergroundModeActive,
    cachedDocumentIds,
    precacheAllDocumentsForUnderground,
    lastOfflineSyncTime,
    toggleMobileNav
  } = useApp();

  const approvedChunksCount = chunks.filter(c => c.isApproved).length;
  const approvedDocsCount = documents.filter(d => d.status === 'approved').length;
  const cachedDocsCount = cachedDocumentIds.length;

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

  return (
    <header id="minemind-header" className="bg-[#FFFFFF] border-b border-[#E4E0D6] px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs sticky top-0 z-20">
      {/* Mobile Hamburger & View Title */}
      <div className="flex items-center gap-2 min-w-0 pr-2 sm:pr-4">
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
          <h1 className="font-serif font-bold text-base sm:text-lg md:text-xl text-[#141C2B] tracking-tight truncate flex items-center gap-2">
            <span className="truncate">{currentViewMeta.title}</span>
            <span className="hidden sm:inline-flex text-[11px] font-mono font-normal text-[#64748B] bg-[#F7F5F0] px-1.5 py-0.5 rounded border border-[#E4E0D6] flex-shrink-0">
              PS-26023
            </span>
            {isUndergroundModeActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                <WifiOff className="w-2.5 h-2.5 text-[#D97706]" />
                <span className="hidden sm:inline">UNDERGROUND OFFLINE</span>
                <span className="sm:hidden">OFFLINE</span>
              </span>
            )}
          </h1>
          <p className="text-[11px] sm:text-xs text-[#64748B] truncate mt-0.5 hidden sm:flex items-center gap-2">
            <span className="truncate">{currentViewMeta.subtitle}</span>
            {isUndergroundModeActive && (
              <span className="text-[11px] text-[#D97706] font-medium flex-shrink-0">
                • Local SW Cache ({cachedDocsCount} docs)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Center/Right Actions & Filters */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {/* Search Quick Bar (Desktop) */}
        <div className="relative w-48 xl:w-56 hidden lg:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
          <input
            id="header-global-search"
            type="text"
            placeholder="Search approved records..."
            value={knowledgeSearchTerm}
            onChange={(e) => {
              setKnowledgeSearchTerm(e.target.value);
              if (activeView !== 'knowledge') {
                setActiveView('knowledge');
              }
            }}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F7F5F0] border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] focus:bg-white transition-all text-[#141C2B]"
          />
        </div>

        {/* Underground / Offline Pre-cache Button */}
        <button
          id="btn-precache-underground"
          onClick={precacheAllDocumentsForUnderground}
          title={`Click to sync all ${documents.length} mining documents into local service worker cache`}
          className="flex items-center gap-1 sm:gap-1.5 bg-[#F7F5F0] hover:bg-[#EFEBE2] text-[#141C2B] border border-[#E4E0D6] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
        >
          <DownloadCloud className="w-3.5 h-3.5 text-[#C8892E]" />
          <span className="hidden md:inline">Cache:</span>
          <span className="font-bold text-[#166534] bg-[#DCFCE7] px-1 sm:px-1.5 py-0.2 rounded text-[10px]">
            {cachedDocsCount}/{documents.length}
          </span>
        </button>

        {/* Offline Underground Simulator Switch */}
        <button
          id="btn-toggle-underground-mode"
          onClick={toggleSimulateOffline}
          title={isUndergroundModeActive ? 'Switch back to online cloud mode' : 'Simulate low-connectivity underground mine pit mode'}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isUndergroundModeActive
              ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] hover:bg-[#FDE68A]'
              : 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0] hover:bg-[#DCFCE7]'
          }`}
        >
          {isUndergroundModeActive ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-[#D97706]" />
              <span className="font-semibold hidden sm:inline">Underground</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-[#16A34A]" />
              <span className="hidden sm:inline">Cloud</span>
            </>
          )}
        </button>

        {/* Subsidiary Scope Selector */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-[#F7F5F0] border border-[#E4E0D6] rounded-lg px-2 sm:px-2.5 py-1">
          <Building2 className="w-3.5 h-3.5 text-[#C8892E]" />
          <span className="text-[11px] font-medium text-[#64748B] hidden xl:inline">Subsidiary:</span>
          <select
            id="select-subsidiary-scope"
            value={selectedSubsidiary}
            onChange={(e) => setSelectedSubsidiary(e.target.value as Subsidiary | 'ALL')}
            className="text-xs font-mono font-semibold bg-transparent text-[#141C2B] focus:outline-none cursor-pointer max-w-[80px] sm:max-w-none"
          >
            {SUBSIDIARIES.map((sub) => (
              <option key={sub} value={sub}>
                {sub === 'ALL' ? 'All Subs' : sub}
              </option>
            ))}
          </select>
        </div>

        {/* Grounding Integrity Pill (Desktop) */}
        <div className="hidden 2xl:flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-lg text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
          <div className="text-[11px] text-[#166534] font-medium flex items-center gap-1">
            <span className="font-mono font-bold">{approvedChunksCount}</span>
            <span>Approved</span>
            <span className="w-1 h-1 rounded-full bg-[#16A34A] mx-0.5" />
            <span className="font-semibold text-[#15803D]">Zero Hallucination</span>
          </div>
        </div>

        {/* Role Pill */}
        <div className={`hidden sm:inline-flex px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-mono font-bold border ${
          currentUser.role === 'admin' 
            ? 'bg-[#141C2B] text-[#C8892E] border-[#141C2B]' 
            : 'bg-[#EFEBE2] text-[#141C2B] border-[#D4CEBF]'
        }`}>
          {currentUser.role === 'admin' ? 'ADMIN' : 'OFFICER'}
        </div>
      </div>
    </header>
  );
};

