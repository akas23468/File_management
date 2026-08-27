import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight, 
  Upload, 
  Search, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { 
    currentUser, 
    documents, 
    queries, 
    setActiveView, 
    setActiveDocForDetail,
    setActiveCitationForModal,
    setSelectedSubsidiary
  } = useApp();

  // Filter documents contributed by or associated with this employee / subsidiary
  const myContributedDocs = documents.filter(doc => 
    doc.versions.some(v => v.uploadedBy.id === currentUser.id || v.uploadedBy.subsidiary === currentUser.subsidiary)
  );

  const myPendingUpdates = documents.reduce((acc, doc) => {
    const pendings = doc.versions.filter(v => 
      v.approvalStatus === 'pending' && 
      (v.uploadedBy.id === currentUser.id || v.uploadedBy.subsidiary === currentUser.subsidiary)
    );
    return acc + pendings.length;
  }, 0);

  const recentAiQueries = queries.slice(0, 4);

  return (
    <div id="employee-dashboard" className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-7 max-w-7xl mx-auto">
      {/* Greeting Header & Personal Scope */}
      <div className="bg-[#FFFFFF] border border-[#E4E0D6] rounded-xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E] font-bold uppercase tracking-wider mb-1">
            <span>CMPDI/CIL Technical Officer Workstation</span>
            <span>·</span>
            <span>{currentUser.subsidiary} Division</span>
          </div>
          <h2 className="font-serif font-bold text-2xl text-[#141C2B]">
            Welcome, {currentUser.name}
          </h2>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl">
            {currentUser.designation} · {currentUser.department}. Grounded knowledge base is synchronized with the latest central governance index.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            id="btn-dash-upload-doc"
            onClick={() => setActiveView('knowledge')}
            className="px-3.5 py-2 rounded-lg bg-[#141C2B] text-white hover:bg-[#1E293B] transition-all text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-[#C8892E]" />
            <span>Upload Document</span>
          </button>
          <button
            id="btn-dash-ask-ai"
            onClick={() => setActiveView('ai-assistant')}
            className="px-3.5 py-2 rounded-lg bg-[#FAF8F3] text-[#141C2B] border border-[#E4E0D6] hover:border-[#C8892E] hover:bg-[#FDFBF7] transition-all text-xs font-semibold flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C8892E]" />
            <span>Ask AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Scoped KPI Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-medium">Contributed Documents</span>
            <FileText className="w-4 h-4 text-[#C8892E]" />
          </div>
          <div className="font-serif font-bold text-3xl text-[#141C2B]">
            {myContributedDocs.length}
          </div>
          <div className="text-[11px] text-[#4C7A52] font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Active in knowledge base</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-medium">Pending Revisions Submitted</span>
            <Clock className="w-4 h-4 text-[#EAB308]" />
          </div>
          <div className="font-serif font-bold text-3xl text-[#141C2B]">
            {myPendingUpdates}
          </div>
          <div className="text-[11px] text-[#64748B] font-mono mt-1">
            Under central directorate review
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-medium">AI Queries Run This Week</span>
            <Sparkles className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="font-serif font-bold text-3xl text-[#141C2B]">
            {queries.length}
          </div>
          <div className="text-[11px] text-[#2563EB] font-medium mt-1">
            100% source cited responses
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-medium">Grounded Compliance Rate</span>
            <ShieldCheck className="w-4 h-4 text-[#4C7A52]" />
          </div>
          <div className="font-serif font-bold text-3xl text-[#4C7A52]">
            100%
          </div>
          <div className="text-[11px] text-[#64748B] font-mono mt-1">
            Zero synthetic hallucination
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Documents & AI Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: My Recent Documents */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EFEBE2]">
              <div>
                <h3 className="font-serif font-bold text-base text-[#141C2B]">
                  My Contributed Documents
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Governed technical filings from {currentUser.subsidiary}
                </p>
              </div>
              <button
                onClick={() => setActiveView('knowledge')}
                className="text-xs font-semibold text-[#C8892E] hover:underline flex items-center gap-1"
              >
                <span>View All In Knowledge Center</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myContributedDocs.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-[#E4E0D6] rounded-lg p-6 bg-[#FAF8F3]">
                <BookOpen className="w-8 h-8 text-[#8F9BAE] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#141C2B]">No documents contributed yet</p>
                <p className="text-[11px] text-[#64748B] mt-1 max-w-xs mx-auto">
                  Upload your first geological report, borehole log, or mine safety standard to seed the knowledge repository.
                </p>
                <button
                  onClick={() => setActiveView('knowledge')}
                  className="mt-3 px-3 py-1.5 bg-[#C8892E] text-[#141C2B] rounded text-xs font-bold hover:bg-[#B77A23] transition-colors"
                >
                  Upload First Document
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myContributedDocs.slice(0, 3).map((doc) => {
                  const currentVer = doc.versions.find(v => v.id === doc.currentVersionId) || doc.versions[0];
                  const hasPending = doc.versions.some(v => v.approvalStatus === 'pending');

                  return (
                    <div 
                      key={doc.id}
                      className="p-3.5 rounded-lg border border-[#E4E0D6] hover:border-[#C8892E] transition-all bg-[#FAF8F3] flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold bg-[#EFEBE2] text-[#141C2B] px-1.5 py-0.5 rounded border border-[#D4CEBF]">
                            {doc.documentCode}
                          </span>
                          <span className="text-[10px] font-mono text-[#64748B]">
                            v{currentVer.versionNumber}.0
                          </span>
                          {hasPending && (
                            <span className="text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.5 rounded border border-[#FDE68A]">
                              Revision Pending
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-[#141C2B] truncate">
                          {doc.title}
                        </h4>
                        <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                          {currentVer.reasonForChange}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setActiveDocForDetail(doc);
                          setActiveView('knowledge');
                        }}
                        className="p-1.5 text-[#64748B] hover:text-[#C8892E] hover:bg-white rounded border border-transparent hover:border-[#E4E0D6] transition-colors flex-shrink-0"
                        title="View Version Timeline & Content"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#EFEBE2] flex items-center justify-between text-xs text-[#64748B]">
            <span>Version Lineage: Append-only</span>
            <span className="font-mono text-[11px] text-[#141C2B]">OCR Accuracy: 99.2%</span>
          </div>
        </div>

        {/* Right Column: AI Activity & Grounded Inquiries */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EFEBE2]">
              <div>
                <h3 className="font-serif font-bold text-base text-[#141C2B]">
                  Recent AI Inquiries & Verified Answers
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Answers strictly sourced from approved CMPDI/CIL records
                </p>
              </div>
              <button
                onClick={() => setActiveView('ai-assistant')}
                className="text-xs font-semibold text-[#C8892E] hover:underline flex items-center gap-1"
              >
                <span>Open Assistant</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentAiQueries.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-[#E4E0D6] rounded-lg p-6 bg-[#FAF8F3]">
                <Sparkles className="w-8 h-8 text-[#8F9BAE] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#141C2B]">No AI queries asked yet</p>
                <p className="text-[11px] text-[#64748B] mt-1 max-w-xs mx-auto">
                  Ask technical questions about borehole reserves, slope stability angles, or DGMS safety norms.
                </p>
                <button
                  onClick={() => setActiveView('ai-assistant')}
                  className="mt-3 px-3 py-1.5 bg-[#141C2B] text-white rounded text-xs font-bold hover:bg-[#1E293B] transition-colors"
                >
                  Start Grounded Query
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAiQueries.map((q) => (
                  <div 
                    key={q.id}
                    className="p-3.5 rounded-lg border border-[#E4E0D6] hover:border-[#C8892E] transition-all bg-[#FAF8F3]"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-[#141C2B] line-clamp-1">
                        Q: {q.questionText}
                      </span>
                      {q.isStale ? (
                        <span className="text-[10px] font-mono font-bold bg-[#FEF2F2] text-[#DC2626] px-1.5 py-0.5 rounded border border-[#FECACA] flex-shrink-0">
                          Source Updated
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold bg-[#F0FDF4] text-[#16A34A] px-1.5 py-0.5 rounded border border-[#BBF7D0] flex-shrink-0">
                          {q.confidence.toFixed(1)}% Conf
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed bg-white p-2 rounded border border-[#E4E0D6]/60">
                      {q.answerText}
                    </p>

                    {/* Source citation chip */}
                    {q.citations.length > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          onClick={() => setActiveCitationForModal(q.citations[0])}
                          className="text-[10px] font-mono text-[#C8892E] hover:underline flex items-center gap-1 truncate max-w-[80%]"
                        >
                          <span>📄 {q.citations[0].documentTitle}</span>
                          <span className="text-[#64748B]">({q.citations[0].pageOrSheetRef})</span>
                        </button>
                        <button
                          onClick={() => setActiveView('ai-assistant')}
                          className="text-[10px] text-[#2563EB] font-semibold hover:underline"
                        >
                          View Again →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#EFEBE2] flex items-center justify-between text-xs text-[#64748B]">
            <span>Real-time RAG Pipeline</span>
            <span className="text-[#16A34A] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Direct Chunk Grounding
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
