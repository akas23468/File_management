import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  GitCompare, 
  ShieldCheck, 
  Check, 
  AlertTriangle, 
  ArrowRight,
  Layers,
  Database
} from 'lucide-react';

export const CompareVersionsModal: React.FC = () => {
  const { compareVersions, setCompareVersions, approveVersion, currentUser } = useApp();

  if (!compareVersions) return null;

  const { v1, v2, doc } = compareVersions;

  const handleQuickApprove = () => {
    approveVersion(doc.id, v2.id, 'Verified via Side-by-Side Diff Inspector');
    setCompareVersions(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E4E0D6] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-[#141C2B] text-white flex items-center justify-between border-b border-[#1E293B]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E]">
              <GitCompare className="w-4 h-4 text-[#C8892E]" />
              <span>Controlled Revision Diff Inspector</span>
              <span>·</span>
              <span>{doc.documentCode}</span>
            </div>
            <h3 className="font-serif font-bold text-lg text-white mt-0.5">
              Comparing Version {v1.versionNumber}.0 vs Version {v2.versionNumber}.0 — {doc.title}
            </h3>
          </div>
          <button
            onClick={() => setCompareVersions(null)}
            className="text-[#94A3B8] hover:text-white p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-[#F7F5F0] flex-1 text-xs">
          {/* Submission Context & AI Flag */}
          <div className="bg-white p-4 rounded-xl border border-[#E4E0D6] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#141C2B] text-xs">
                Revision Target: Version {v2.versionNumber}.0 ({v2.approvalPriority?.toUpperCase() || 'NORMAL'} PRIORITY)
              </span>
              <span className="font-mono text-[11px] text-[#64748B]">
                Submitted: {new Date(v2.uploadedAt).toLocaleDateString()} by {v2.uploadedBy.name}
              </span>
            </div>
            <p className="text-xs text-[#475569]">
              <strong>Reason for Update:</strong> {v2.reasonForChange}
            </p>
            {v2.aiRiskReason && (
              <div className="p-2 bg-[#FEF2F2] border border-[#FECACA] rounded text-xs text-[#991B1B] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] flex-shrink-0" />
                <span>{v2.aiRiskReason}</span>
              </div>
            )}
          </div>

          {/* Metric Comparison Table */}
          {v2.keyMetrics && (
            <div className="bg-white p-4 rounded-xl border border-[#E4E0D6] space-y-3">
              <h4 className="font-serif font-bold text-xs text-[#141C2B]">
                Parameter & Assay Variances
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                {v2.keyMetrics.map((km, idx) => (
                  <div key={idx} className="p-3 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                    <span className="text-[10px] text-[#64748B] block">{km.label}</span>
                    <span className="font-bold text-sm text-[#141C2B]">{km.value}</span>
                    {km.variance && (
                      <span className="text-[10px] text-[#C8892E] font-bold block mt-1">
                        Δ {km.variance} vs v{v1.versionNumber}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Side-by-Side Text Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Version N-1 (Baseline) */}
            <div className="bg-white p-5 rounded-xl border border-[#E4E0D6] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFEBE2]">
                <div className="font-mono font-bold text-xs text-[#64748B]">
                  BASELINE VERSION {v1.versionNumber}.0
                </div>
                <span className="text-[10px] font-mono bg-[#F0FDF4] text-[#16A34A] px-2 py-0.5 rounded font-bold">
                  {v1.approvalStatus.toUpperCase()}
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F3] rounded-lg font-mono text-[11px] text-[#475569] leading-relaxed max-h-64 overflow-y-auto">
                {v1.extractedText}
              </div>

              <div className="text-[10px] font-mono text-[#8F9BAE]">
                Uploaded by: {v1.uploadedBy.name} ({v1.uploadedBy.subsidiary})
              </div>
            </div>

            {/* Version N (Proposed Revision) */}
            <div className="bg-white p-5 rounded-xl border-2 border-[#C8892E] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFEBE2]">
                <div className="font-mono font-bold text-xs text-[#C8892E]">
                  PROPOSED REVISION VERSION {v2.versionNumber}.0
                </div>
                <span className="text-[10px] font-mono bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded font-bold">
                  {v2.approvalStatus.toUpperCase()}
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F3] rounded-lg font-mono text-[11px] text-[#141C2B] leading-relaxed max-h-64 overflow-y-auto border border-[#C8892E]/40">
                {v2.extractedText}
              </div>

              <div className="text-[10px] font-mono text-[#8F9BAE] flex items-center justify-between">
                <span>Uploaded by: {v2.uploadedBy.name}</span>
                <span className="text-[#16A34A] font-bold">OCR Score: {v2.ocrConfidence}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-[#E4E0D6] flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#64748B]">
            Approving replaces active vector index with Version {v2.versionNumber}.0
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompareVersions(null)}
              className="px-4 py-2 bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg hover:bg-[#D4CEBF]"
            >
              Close Diff
            </button>

            {currentUser.role === 'admin' && v2.approvalStatus === 'pending' && (
              <button
                onClick={handleQuickApprove}
                className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve & Re-Index v{v2.versionNumber}.0</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
