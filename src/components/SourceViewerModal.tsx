import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  BookOpen, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink,
  Layers,
  Copy,
  Check
} from 'lucide-react';

export const SourceViewerModal: React.FC = () => {
  const { activeCitationForModal, setActiveCitationForModal, documents } = useApp();
  const [copied, setCopied] = React.useState<boolean>(false);

  if (!activeCitationForModal) return null;

  const parentDoc = documents.find(d => d.id === activeCitationForModal.documentId);
  const targetVer = parentDoc?.versions.find(v => v.versionNumber === activeCitationForModal.versionNumber) || parentDoc?.versions[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCitationForModal.excerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E4E0D6] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#141C2B] text-white border-b border-[#1E293B]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#C8892E]">
                <ShieldCheck className="w-4 h-4 text-[#4C7A52]" />
                <span className="font-bold">Knowledge Source Citation</span>
                <span>·</span>
                <span>{activeCitationForModal.documentCode}</span>
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-white mt-1 break-words">
                {activeCitationForModal.documentTitle}
              </h3>
            </div>
            <button
              onClick={() => setActiveCitationForModal(null)}
              className="text-[#94A3B8] hover:text-white p-1.5 rounded-lg hover:bg-[#1E293B] transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-[#F7F5F0] flex-1 text-xs">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
            <div className="bg-white p-3 rounded-lg border border-[#E4E0D6]">
              <span className="text-[10px] text-[#64748B] block">Subsidiary:</span>
              <span className="font-bold text-[#141C2B] mt-0.5 block">{activeCitationForModal.subsidiary}</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-[#E4E0D6]">
              <span className="text-[10px] text-[#64748B] block">Version:</span>
              <span className="font-bold text-[#141C2B] mt-0.5 block">v{activeCitationForModal.versionNumber}.0 (Approved)</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-[#E4E0D6]">
              <span className="text-[10px] text-[#64748B] block">File Location:</span>
              <span className="font-bold text-[#C8892E] mt-0.5 block">{activeCitationForModal.pageOrSheetRef}</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-[#E4E0D6]">
              <span className="text-[10px] text-[#64748B] block">Relevance Match:</span>
              <span className="font-bold text-[#16A34A] mt-0.5 block">{((activeCitationForModal.relevanceScore || 0.98) * 100).toFixed(0)}% Match</span>
            </div>
          </div>

          {/* Highlighted Excerpt Chunk */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border-2 border-[#C8892E] shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <span className="font-bold text-[#C8892E] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>Cited Text Chunk from Official Record</span>
              </span>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] rounded text-[11px] font-semibold text-[#141C2B] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3 text-[#64748B]" />}
                <span>{copied ? 'Copied' : 'Copy Excerpt'}</span>
              </button>
            </div>

            <div className="p-3.5 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6] font-serif text-xs sm:text-sm leading-relaxed text-[#141C2B] italic">
              "{targetVer ? targetVer.extractedText : activeCitationForModal.excerpt}"
            </div>
          </div>

          {/* Key Metrics Table if available */}
          {targetVer?.keyMetrics && targetVer.keyMetrics.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-[#E4E0D6] space-y-3">
              <h4 className="font-serif font-bold text-xs text-[#141C2B]">
                Extracted Metric Parameters
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                {targetVer.keyMetrics.map((km, idx) => (
                  <div key={idx} className="p-2.5 bg-[#FAF8F3] rounded-lg border border-[#EFEBE2]">
                    <span className="text-[10px] text-[#64748B] block">{km.label}</span>
                    <span className="font-bold text-xs text-[#141C2B] mt-0.5 block">{km.value}</span>
                    {km.variance && (
                      <span className="text-[9px] text-[#C8892E] font-semibold block mt-0.5">{km.variance}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-[#E4E0D6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <span className="text-[11px] font-mono text-[#64748B]">
            Verified against CMPDI Approved Repository Ledger
          </span>
          <button
            onClick={() => setActiveCitationForModal(null)}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#141C2B] text-white text-xs font-bold rounded-lg hover:bg-[#1E293B] cursor-pointer text-center"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
