import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Settings, 
  ShieldCheck, 
  UserCheck, 
  Building2, 
  Database, 
  Lock, 
  Server, 
  Key, 
  Check, 
  FileCheck2 
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { currentUser, switchRole } = useApp();

  return (
    <div id="settings-view" className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-7 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#141C2B] text-white border border-[#1E293B] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E] font-bold uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4 text-[#C8892E]" />
            <span>Platform Governance & Policy Engine</span>
          </div>
          <h2 className="font-serif font-bold text-2xl text-white">
            System Administration & RBAC Security
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Configure subsidiary data isolation, grounding strictness, and role-based permissions.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#CBD5E1] bg-[#192234] px-3 py-1.5 rounded-lg border border-[#334155]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>Security Protocol: Tier-1 Govt Restrictive</span>
        </div>
      </div>

      {/* Grid: RBAC Matrix & Subsidiary Governance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RBAC Matrix */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-[#EFEBE2]">
            <h3 className="font-serif font-bold text-base text-[#141C2B] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#C8892E]" />
              <span>Role-Based Access Control (RBAC) Permissions Matrix</span>
            </h3>
            <p className="text-xs text-[#64748B]">
              Rigorous boundary enforcement between field officers and central directorate administrators.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#FAF8F3] border-b border-[#E4E0D6] text-[#64748B]">
                  <th className="py-2.5 px-3 font-semibold">Capability / Operation</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Officer (Employee)</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Chief Mining Eng (Admin)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEBE2]">
                {[
                  { name: 'Upload Technical Filings', emp: true, adm: true },
                  { name: 'Submit Document Revisions', emp: true, adm: true },
                  { name: 'Grounded AI Q&A Retrieval', emp: true, adm: true },
                  { name: 'Generate Automated Reports', emp: true, adm: true },
                  { name: 'Approve / Reject Revisions', emp: false, adm: true },
                  { name: 'Re-index AI Knowledge Vectors', emp: false, adm: true },
                  { name: 'Inspect Immutable Audit Trail', emp: false, adm: true },
                  { name: 'Modify System Policies', emp: false, adm: true },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF8F3]">
                    <td className="py-2 px-3 text-[#141C2B] font-sans font-medium">{row.name}</td>
                    <td className="py-2 px-3 text-center">
                      {row.emp ? <span className="text-[#16A34A] font-bold">✓ ALLOWED</span> : <span className="text-[#DC2626] font-bold">✗ RESTRICTED</span>}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {row.adm ? <span className="text-[#16A34A] font-bold">✓ ALLOWED</span> : <span className="text-[#DC2626] font-bold">✗ RESTRICTED</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Knowledge Pipeline Governance & AI Engine Status */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-[#EFEBE2]">
            <h3 className="font-serif font-bold text-base text-[#141C2B] flex items-center gap-2">
              <Server className="w-4 h-4 text-[#C8892E]" />
              <span>Grounded Knowledge Architecture Configuration</span>
            </h3>
            <p className="text-xs text-[#64748B]">
              Hardware, vector embedding models, and server-side LLM connectivity.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#141C2B] block">LLM Reasoning Model</span>
                <span className="text-[11px] text-[#64748B]">Google Gemini 3.7 Flash (Server-Side Secure)</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#F0FDF4] text-[#16A34A] px-2 py-0.5 rounded border border-[#BBF7D0]">
                ACTIVE
              </span>
            </div>

            <div className="p-3 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#141C2B] block">Vector Storage & Embedding Engine</span>
                <span className="text-[11px] text-[#64748B]">ChromaDB / pgvector (Cosine Similarity / Hybrid Lexical)</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#F0FDF4] text-[#16A34A] px-2 py-0.5 rounded border border-[#BBF7D0]">
                SYNCHRONIZED
              </span>
            </div>

            <div className="p-3 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#141C2B] block">Grounding Verification Threshold</span>
                <span className="text-[11px] text-[#64748B]">Minimum Confidence: 85.0% · Zero Extrapolation Policy</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#141C2B] text-[#C8892E] px-2 py-0.5 rounded">
                ENFORCED
              </span>
            </div>

            <div className="p-3 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#141C2B] block">OCR & Vision Parsing Engine</span>
                <span className="text-[11px] text-[#64748B]">Tesseract 5 + Tabula Table Extraction</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#F0FDF4] text-[#16A34A] px-2 py-0.5 rounded border border-[#BBF7D0]">
                ONLINE (99.2% Conf)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
