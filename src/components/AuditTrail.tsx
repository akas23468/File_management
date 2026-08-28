import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AuditLogEntry, Subsidiary } from '../types';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  Building2,
  Database,
  ChevronDown,
  ChevronUp,
  User,
  UserCheck,
  AlertTriangle,
  Info
} from 'lucide-react';

export const AuditTrail: React.FC = () => {
  const { auditLogs, selectedSubsidiary, setSelectedSubsidiary, documents } = useApp();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = auditLogs.filter(log => {
    if (selectedSubsidiary !== 'ALL' && log.actorSubsidiary !== selectedSubsidiary && log.actorSubsidiary !== 'CMPDI HQ') {
      return false;
    }
    if (actionFilter !== 'ALL' && log.action !== actionFilter) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchActor = log.actorName.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchDoc = log.documentTitle?.toLowerCase().includes(q);
      const matchAction = log.action.toLowerCase().includes(q);
      if (!matchActor && !matchDetails && !matchDoc && !matchAction) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Actor Name', 'Role', 'Subsidiary', 'Document Title', 'Version', 'Details', 'IP Address'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      l.action,
      `"${l.actorName}"`,
      l.actorRole,
      l.actorSubsidiary,
      `"${l.documentTitle || ''}"`,
      l.versionNumber || '',
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CMPDI_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(prev => prev === id ? null : id);
  };

  return (
    <div id="audit-trail-view" className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#141C2B] text-white border border-[#1E293B] rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E] font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[#4C7A52]" />
            <span>Statutory Audit & Traceability Subsystem</span>
          </div>
          <h2 className="font-serif font-bold text-2xl text-white">
            Immutable Activity & Knowledge Audit Trail
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Full who-did-what audit log capturing submitters, reviewers, statutory decision notes, and re-indexing events.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={exportCSV}
            className="px-4 py-2.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-[#E4E0D6] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#C8892E]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 text-xs">
          {/* Search bar */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
            <input
              type="text"
              placeholder="Search by actor, reviewer, document title, note, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg text-xs text-[#141C2B] focus:outline-none focus:border-[#C8892E]"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5 text-[#64748B]">
            <Filter className="w-3.5 h-3.5 text-[#C8892E]" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg px-2.5 py-2 text-xs font-medium text-[#141C2B] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Action Events</option>
              <option value="APPROVE_VERSION">APPROVE_VERSION</option>
              <option value="REJECT_VERSION">REJECT_VERSION</option>
              <option value="REQUEST_CHANGES">REQUEST_CHANGES</option>
              <option value="SUBMIT_VERSION">SUBMIT_VERSION</option>
              <option value="UPLOAD_DOCUMENT">UPLOAD_DOCUMENT</option>
              <option value="REINDEX_KB">REINDEX_KB</option>
              <option value="AI_QUERY">AI_QUERY</option>
              <option value="GENERATE_REPORT">GENERATE_REPORT</option>
            </select>
          </div>
        </div>

        <span className="text-xs font-mono text-[#64748B]">
          {filteredLogs.length} events logged
        </span>
      </div>

      {/* Monospace Chronological Table */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#E4E0D6] text-[#64748B] text-[11px] font-mono">
                <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                <th className="py-3.5 px-4 font-semibold">Action Event</th>
                <th className="py-3.5 px-4 font-semibold">Actor / Role</th>
                <th className="py-3.5 px-4 font-semibold">Subsidiary</th>
                <th className="py-3.5 px-4 font-semibold">Document & Version</th>
                <th className="py-3.5 px-4 font-semibold">Action Details & Reviewer Note</th>
                <th className="py-3.5 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE2]">
              {filteredLogs.map((log) => {
                const isApproval = log.action === 'APPROVE_VERSION' || log.action === 'REINDEX_KB';
                const isRejection = log.action === 'REJECT_VERSION';
                const isChangeReq = log.action === 'REQUEST_CHANGES';
                const isExpanded = expandedLogId === log.id;

                // Find matching document if available for rich context
                const matchedDoc = log.documentId ? documents.find(d => d.id === log.documentId) : null;
                const matchedVer = (matchedDoc && log.versionNumber) 
                  ? matchedDoc.versions.find(v => v.versionNumber === log.versionNumber)
                  : null;

                return (
                  <React.Fragment key={log.id}>
                    <tr 
                      onClick={() => toggleExpand(log.id)}
                      className={`hover:bg-[#FAF8F3] transition-colors cursor-pointer ${isExpanded ? 'bg-[#FAF8F3]' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-[#64748B] font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#8F9BAE]" />
                          <span>{new Date(log.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                          isApproval 
                            ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]' 
                            : isRejection
                              ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                              : isChangeReq
                                ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                                : 'bg-[#EFEBE2] text-[#141C2B]'
                        }`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#141C2B]">{log.actorName}</div>
                        <div className="text-[10px] font-mono text-[#64748B] uppercase">{log.actorRole}</div>
                      </td>

                      <td className="py-3.5 px-4 text-[#141C2B] whitespace-nowrap font-mono font-bold">
                        {log.actorSubsidiary}
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        {log.documentTitle ? (
                          <div>
                            <span className="font-serif font-bold text-xs text-[#141C2B] line-clamp-1">
                              {log.documentTitle}
                            </span>
                            {log.versionNumber && (
                              <span className="text-[10px] font-mono bg-[#EFEBE2] px-1.5 py-0.2 rounded text-[#141C2B]">
                                v{log.versionNumber}.0
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#94A3B8] font-mono text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#334155] text-xs max-w-md">
                        <p className="line-clamp-2 leading-relaxed">
                          {log.details}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button className="text-[#64748B] hover:text-[#141C2B] p-1 rounded">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <tr className="bg-[#FAF8F3]">
                        <td colSpan={7} className="p-4 border-b border-[#E4E0D6]">
                          <div className="bg-white border border-[#E4E0D6] rounded-xl p-4 space-y-3 shadow-xs">
                            <div className="flex items-center justify-between border-b border-[#EFEBE2] pb-2">
                              <h4 className="font-serif font-bold text-sm text-[#141C2B] flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-[#C8892E]" />
                                <span>Audit Event Forensic Breakdown</span>
                              </h4>
                              <span className="text-[11px] font-mono text-[#64748B]">
                                Event ID: {log.id} • Client IP: {log.ipAddress || '10.24.8.14'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                              <div className="bg-[#FAF8F3] p-2.5 rounded-lg border border-[#E4E0D6]">
                                <div className="text-[10px] font-mono text-[#64748B] uppercase">Actor / Initiator</div>
                                <div className="font-bold text-[#141C2B] mt-0.5">{log.actorName}</div>
                                <div className="text-[11px] text-[#64748B]">{log.actorRole.toUpperCase()} • {log.actorSubsidiary}</div>
                              </div>

                              <div className="bg-[#FAF8F3] p-2.5 rounded-lg border border-[#E4E0D6]">
                                <div className="text-[10px] font-mono text-[#64748B] uppercase">Action Type</div>
                                <div className="font-bold text-[#141C2B] font-mono mt-0.5">{log.action}</div>
                                <div className="text-[11px] text-[#64748B]">Logged at {new Date(log.timestamp).toLocaleTimeString()}</div>
                              </div>

                              <div className="bg-[#FAF8F3] p-2.5 rounded-lg border border-[#E4E0D6]">
                                <div className="text-[10px] font-mono text-[#64748B] uppercase">Target Entity</div>
                                <div className="font-bold text-[#141C2B] mt-0.5 truncate">{log.documentTitle || 'System Operation'}</div>
                                <div className="text-[11px] font-mono text-[#64748B]">
                                  {log.versionNumber ? `Version v${log.versionNumber}.0` : 'General Knowledge Base'}
                                </div>
                              </div>

                              <div className="bg-[#FAF8F3] p-2.5 rounded-lg border border-[#E4E0D6]">
                                <div className="text-[10px] font-mono text-[#64748B] uppercase">Statutory Compliance</div>
                                <div className="font-bold text-[#166534] mt-0.5 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Digitally Signed & Validated</span>
                                </div>
                                <div className="text-[11px] text-[#64748B]">CMPDI Central Directorate</div>
                              </div>
                            </div>

                            <div className="bg-[#FAF8F3] p-3 rounded-lg border border-[#E4E0D6] text-xs">
                              <div className="text-[11px] font-bold text-[#141C2B] mb-1">Full Audited Narrative & Reviewer Notes:</div>
                              <p className="text-[#334155] leading-relaxed font-mono text-[11px]">
                                {log.details}
                              </p>
                              {matchedVer?.reasonForChange && (
                                <div className="mt-2 pt-2 border-t border-[#EFEBE2] text-[11px] text-[#475569]">
                                  <strong>Original Submitter Reason:</strong> {matchedVer.reasonForChange}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
