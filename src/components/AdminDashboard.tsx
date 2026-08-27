import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CheckSquare, 
  FileText, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronRight, 
  ArrowUpRight, 
  Layers, 
  Sparkles,
  CheckCircle2,
  Building2,
  Filter,
  Eye,
  Zap
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    documents, 
    auditLogs, 
    reports, 
    setActiveView, 
    setCompareVersions, 
    bulkApproveRoutine,
    topicInsights
  } = useApp();

  const [expandedUrgentId, setExpandedUrgentId] = useState<string | null>('ver_korba_03');

  // Collect pending approvals across all documents
  const pendingApprovals: { doc: any; version: any }[] = [];
  documents.forEach(doc => {
    doc.versions.forEach(v => {
      if (v.approvalStatus === 'pending') {
        pendingApprovals.push({ doc, version: v });
      }
    });
  });

  const urgentCount = pendingApprovals.filter(p => p.version.approvalPriority === 'urgent').length;
  const normalCount = pendingApprovals.filter(p => p.version.approvalPriority === 'normal').length;
  const routineCount = pendingApprovals.filter(p => p.version.approvalPriority === 'routine' || !p.version.approvalPriority).length;

  return (
    <div id="admin-dashboard" className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-7 max-w-7xl mx-auto">
      {/* Priority-Sorted Approval Summary Banner (As specified in Section 5.3) */}
      <div className="bg-[#141C2B] text-white border border-[#1E293B] rounded-xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E] font-bold uppercase tracking-wider mb-1">
              <span>Central Governance Priority Matrix</span>
              <span>·</span>
              <span>Re-Indexing Queue</span>
            </div>
            <h2 className="font-serif font-bold text-2xl text-white flex items-center gap-2.5">
              <span>{pendingApprovals.length} Pending Technical Approvals</span>
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#94A3B8]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="font-bold text-white">{urgentCount} Urgent</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308]" />
                <span className="font-bold text-white">{normalCount} Normal</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                <span className="font-bold text-white">{routineCount} Routine</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              id="btn-admin-bulk-routine"
              onClick={() => bulkApproveRoutine()}
              className="px-3.5 py-2 rounded-lg bg-[#243147] hover:bg-[#334155] border border-[#334155] text-xs font-semibold text-white transition-all flex items-center gap-1.5"
              title="Only routine/low-risk items are eligible for bulk sign-off. Urgent items remain blocked."
            >
              <Zap className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Bulk Routine Approve</span>
            </button>

            <button
              id="btn-admin-view-all-queue"
              onClick={() => setActiveView('approval-queue')}
              className="px-4 py-2 rounded-lg bg-[#C8892E] hover:bg-[#B77A23] text-[#141C2B] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Open Approval Queue</span>
            </button>
          </div>
        </div>

        {/* Priority Items List with AI One-Line Reasoning */}
        <div className="mt-4 space-y-2.5">
          {pendingApprovals.length === 0 ? (
            <div className="py-4 text-center text-xs text-[#94A3B8] font-mono">
              ✓ All subsidiary submissions are currently verified and indexed into the knowledge base.
            </div>
          ) : (
            pendingApprovals.map(({ doc, version }) => {
              const isUrgent = version.approvalPriority === 'urgent';
              const isExpanded = expandedUrgentId === version.id;

              return (
                <div 
                  key={version.id}
                  className={`rounded-lg border p-3.5 transition-all ${
                    isUrgent 
                      ? 'bg-[#1E1719] border-[#7F1D1D]' 
                      : 'bg-[#192234] border-[#1E293B]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isUrgent ? 'bg-[#DC2626] text-white' : 'bg-[#EAB308] text-[#141C2B]'
                      }`}>
                        {isUrgent ? '🔴 URGENT REVIEW' : '🟡 STANDARD REVIEW'}
                      </span>
                      <span className="text-xs font-bold text-white truncate">
                        {doc.title} (v{version.versionNumber}.0)
                      </span>
                      <span className="text-[10px] font-mono text-[#94A3B8] bg-[#0E1522] px-1.5 py-0.5 rounded">
                        {doc.subsidiary}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          const prevVer = doc.versions.find((v: any) => v.versionNumber === version.versionNumber - 1) || doc.versions[0];
                          setCompareVersions({ v1: prevVer, v2: version, doc });
                        }}
                        className="px-2.5 py-1 rounded bg-[#243147] hover:bg-[#334155] text-[11px] font-medium text-[#CBD5E1] transition-colors"
                      >
                        Compare Diff
                      </button>
                      <button
                        onClick={() => setActiveView('approval-queue')}
                        className="p-1 text-[#94A3B8] hover:text-white"
                        title="Open in Queue"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* AI Flagged Risk Summary */}
                  {version.aiRiskReason && (
                    <div className="mt-2.5 pt-2 border-t border-[#7F1D1D]/50 flex items-start gap-2 text-xs text-[#FCA5A5] bg-[#450A0A]/40 p-2 rounded">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-[#EF4444] mt-0.5" />
                      <div>
                        <span className="font-bold text-white">AI Governance Flag: </span>
                        <span>{version.aiRiskReason}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Org-Wide KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Documents */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-medium">Total Governed Documents</span>
            <FileText className="w-4 h-4 text-[#C8892E]" />
          </div>
          <div className="font-serif font-bold text-3xl text-[#141C2B]">
            {documents.length}
          </div>
          <div className="text-[11px] text-[#64748B] font-mono mt-1">Across 8 subsidiaries</div>
        </div>

        {/* Updated This Month */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-medium">Revisions This Month</span>
            <Layers className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="font-serif font-bold text-3xl text-[#141C2B]">
            4
          </div>
          <div className="text-[11px] text-[#4C7A52] font-medium mt-1">+33% vs last quarter</div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-medium">Pending Approvals</span>
            <Clock className="w-4 h-4 text-[#EAB308]" />
          </div>
          <div className="font-serif font-bold text-3xl text-[#EAB308]">
            {pendingApprovals.length}
          </div>
          <div className="text-[11px] text-[#EF4444] font-medium mt-1">{urgentCount} requires urgent review</div>
        </div>

        {/* Reports Generated */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-medium">Reports Generated</span>
            <FileText className="w-4 h-4 text-[#4C7A52]" />
          </div>
          <div className="font-serif font-bold text-3xl text-[#141C2B]">
            {reports.length}
          </div>
          <div className="text-[11px] text-[#64748B] font-mono mt-1">100% cited citations</div>
        </div>

        {/* Avg Approval Turnaround */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-1">
            <span className="text-xs font-medium">Avg. Turnaround</span>
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="font-serif font-bold text-3xl text-[#141C2B]">
            1.8 <span className="text-sm font-sans font-normal text-[#64748B]">days</span>
          </div>
          <div className="text-[11px] text-[#16A34A] font-medium mt-1">Statutory target: &lt; 3.0 days</div>
        </div>
      </div>

      {/* Two Column Grid: System Activity & Topic Insights Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent System Audit Activity Feed */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EFEBE2]">
              <div>
                <h3 className="font-serif font-bold text-base text-[#141C2B]">
                  System-Wide Activity & Audit Stream
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Real-time log of document submissions, approvals, and queries
                </p>
              </div>
              <button
                onClick={() => setActiveView('audit-trail')}
                className="text-xs font-semibold text-[#C8892E] hover:underline flex items-center gap-1"
              >
                <span>Full Audit Trail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {auditLogs.slice(0, 4).map((log) => (
                <div 
                  key={log.id}
                  className="p-3 rounded-lg border border-[#E4E0D6] bg-[#FAF8F3] flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold bg-[#EFEBE2] px-1.5 py-0.5 rounded text-[#141C2B]">
                        {log.action}
                      </span>
                      <span className="font-mono text-[10px] text-[#64748B]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[10px] font-semibold text-[#64748B]">
                        {log.actorName} ({log.actorSubsidiary})
                      </span>
                    </div>
                    <p className="text-[#334155] leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EFEBE2] flex items-center justify-between text-xs text-[#64748B]">
            <span>Audit Integrity: Immutable SHA-256 Ledger</span>
            <span className="font-mono text-[11px] text-[#141C2B]">{auditLogs.length} Events Logged</span>
          </div>
        </div>

        {/* Right Column: AI Topic Trend Mini Widget */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EFEBE2]">
              <div>
                <h3 className="font-serif font-bold text-base text-[#141C2B]">
                  Knowledge Topic Distribution
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  High-frequency technical topics across subsidiaries
                </p>
              </div>
              <button
                onClick={() => setActiveView('ai-insights')}
                className="text-xs font-semibold text-[#C8892E] hover:underline flex items-center gap-1"
              >
                <span>Open AI Insights</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {topicInsights.slice(0, 4).map((t) => (
                <div 
                  key={t.topic}
                  className="p-3 rounded-lg border border-[#E4E0D6] bg-[#FAF8F3] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-[#141C2B] truncate">{t.topic}</span>
                      <span className="font-mono text-[10px] text-[#64748B] font-semibold">{t.occurrences} references</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#EFEBE2] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#C8892E] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (t.occurrences / 150) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold bg-[#EFEBE2] px-2 py-1 rounded text-[#141C2B] flex-shrink-0">
                    {t.confidence}% Conf
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EFEBE2] flex items-center justify-between text-xs text-[#64748B]">
            <span>Topic Cluster Resolution</span>
            <span className="text-[#C8892E] font-semibold">Real-time Semantic Index</span>
          </div>
        </div>
      </div>
    </div>
  );
};
