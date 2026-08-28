import React from 'react';
import { useApp, AppView } from '../context/AppContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Sparkles, 
  FileText, 
  Clock, 
  CheckSquare, 
  TrendingUp, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    currentUser, 
    activeView, 
    setActiveView, 
    logout, 
    documents,
    isMobileNavOpen,
    setIsMobileNavOpen
  } = useApp();

  const handleNavClick = (viewId: AppView) => {
    setActiveView(viewId);
    setIsMobileNavOpen(false);
  };

  const pendingApprovalsCount = documents.reduce((acc, doc) => {
    return acc + doc.versions.filter(v => v.approvalStatus === 'pending').length;
  }, 0);

  const urgentApprovalsCount = documents.reduce((acc, doc) => {
    return acc + doc.versions.filter(v => v.approvalStatus === 'pending' && v.approvalPriority === 'urgent').length;
  }, 0);

  interface NavItem {
    id: AppView;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    urgentBadge?: number;
  }

  // Employee menu entries (including Settings)
  const employeeNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'knowledge', label: 'Knowledge Center', icon: BookOpen },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
    { id: 'my-updates', label: 'My Updates', icon: Clock },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Admin menu entries (as specified strictly in Section 4)
  const adminNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'knowledge', label: 'Knowledge Center', icon: BookOpen },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
    { id: 'approval-queue', label: 'Approval Queue', icon: CheckSquare, badge: pendingApprovalsCount, urgentBadge: urgentApprovalsCount },
    { id: 'ai-insights', label: 'AI Insights', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'audit-trail', label: 'Audit Trail', icon: ShieldAlert },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = currentUser.role === 'admin' ? adminNavItems : employeeNavItems;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileNavOpen && (
        <div 
          id="sidebar-mobile-backdrop"
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside 
        id="minemind-sidebar" 
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#141C2B] text-[#EFEBE2] flex flex-col flex-shrink-0 border-r border-[#1E293B] select-none h-screen transition-transform duration-300 ease-in-out md:static md:w-64 md:translate-x-0 ${
          isMobileNavOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E293B] bg-[#0E1522] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C8892E] to-[#8E5D18] flex items-center justify-center shadow-inner text-[#141C2B] font-serif font-black text-xl flex-shrink-0">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-serif font-bold text-base sm:text-lg tracking-tight text-white">MINEMIND <span className="text-[#C8892E]">AI</span></h1>
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            id="btn-close-mobile-sidebar"
            onClick={() => setIsMobileNavOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[#8F9BAE] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-[#64748B]">
            {currentUser.role === 'admin' ? 'Governance & Intelligence' : 'Officer Workstation'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-[#C8892E] text-[#141C2B] font-semibold shadow-sm'
                    : 'text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#141C2B]' : 'text-[#8F9BAE] group-hover:text-[#C8892E] transition-colors'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <div className="flex items-center gap-1">
                    {item.urgentBadge && item.urgentBadge > 0 ? (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        isActive ? 'bg-[#991B1B] text-white' : 'bg-[#DC2626] text-white animate-pulse'
                      }`}>
                        {item.urgentBadge}🔴
                      </span>
                    ) : null}
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-[#141C2B] text-[#C8892E]' : 'bg-[#1E293B] text-[#CBD5E1]'
                    }`}>
                      {item.badge}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer Card */}
        <div className="p-3 border-t border-[#1E293B] bg-[#0E1522]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#243147] border border-[#334155] flex items-center justify-center text-xs font-mono font-bold text-[#CBD5E1]">
                {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-[#8F9BAE] font-mono truncate">{currentUser.employeeId}</p>
              </div>
            </div>
            <button
              id="btn-logout"
              onClick={() => {
                logout();
                setIsMobileNavOpen(false);
              }}
              className="p-1.5 text-[#8F9BAE] hover:text-[#EF4444] hover:bg-[#1E293B] rounded transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
