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
  Database
} from 'lucide-react';

export const AuditTrail: React.FC = () => {
  const { auditLogs, selectedSubsidiary, setSelectedSubsidiary } = useApp();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

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

  const exportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(filteredLogs, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `CMPDI_Audit_Trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div id="audit-trail-view" className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#141C2B] text-white border border-[#1E293B] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E] font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[#4C7A52]" />
            <span>Statutory Audit & Traceability Subsystem</span>
          </div>
          <h2 className="font-serif font-bold text-2xl text-white">
            Immutable Activity & Knowledge Audit Trail
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Tamper-evident record of all document submissions, approvals, re-indexing events, and AI queries.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-[#E4E0D6]"
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
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
            <input
              type="text"
              placeholder="Filter by actor, document, keyword, or action..."
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
              className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg px-2.5 py-2 text-xs font-medium text-[#141C2B] focus:outline-none"
            >
              <option value="ALL">All Action Types</option>
              <option value="APPROVE_VERSION">APPROVE_VERSION</option>
              <option value="SUBMIT_VERSION">SUBMIT_VERSION</option>
              <option value="REINDEX_KB">REINDEX_KB</option>
              <option value="AI_QUERY">AI_QUERY</option>
              <option value="GENERATE_REPORT">GENERATE_REPORT</option>
              <option value="REQUEST_CHANGES">REQUEST_CHANGES</option>
              <option value="REJECT_VERSION">REJECT_VERSION</option>
            </select>
          </div>
        </div>

        <span className="text-[11px] font-mono text-[#64748B]">
          {filteredLogs.length} events logged
        </span>
      </div>

      {/* Monospace Chronological Table */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#E4E0D6] text-[#64748B] text-[11px]">
                <th className="py-3 px-4 font-semibold">Timestamp (UTC+5:30)</th>
                <th className="py-3 px-4 font-semibold">Action Event</th>
                <th className="py-3 px-4 font-semibold">Actor / Role</th>
                <th className="py-3 px-4 font-semibold">Subsidiary</th>
                <th className="py-3 px-4 font-semibold">Audited Details</th>
                <th className="py-3 px-4 font-semibold">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE2]">
              {filteredLogs.map((log) => {
                const isApproval = log.action === 'APPROVE_VERSION' || log.action === 'REINDEX_KB';
                const isRejection = log.action === 'REJECT_VERSION';

                return (
                  <tr key={log.id} className="hover:bg-[#FAF8F3] transition-colors">
                    <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isApproval 
                          ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]' 
                          : isRejection
                            ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                            : 'bg-[#EFEBE2] text-[#141C2B]'
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[#141C2B] font-semibold whitespace-nowrap">
                      {log.actorName}
                      <span className="block text-[10px] text-[#64748B] font-normal uppercase">{log.actorRole}</span>
                    </td>

                    <td className="py-3 px-4 text-[#141C2B] whitespace-nowrap font-bold">
                      {log.actorSubsidiary}
                    </td>

                    <td className="py-3 px-4 text-[#334155] font-sans text-xs max-w-md">
                      {log.details}
                      {log.documentTitle && (
                        <div className="font-mono text-[10px] text-[#C8892E] font-semibold mt-0.5">
                          Doc: {log.documentTitle} {log.versionNumber ? `(v${log.versionNumber}.0)` : ''}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#64748B] text-[11px] whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
