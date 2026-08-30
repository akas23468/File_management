import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getStorageSignedUrl } from '../services/supabaseDataService';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  ChevronRight, 
  Layers, 
  MessageSquare,
  Sparkles,
  Plus,
  ExternalLink
} from 'lucide-react';

export const MyUpdates: React.FC = () => {
  const { 
    currentUser, 
    documents, 
    setActiveView, 
    setActiveDocForDetail, 
    setCompareVersions 
  } = useApp();

  const [loadingSignedUrlPath, setLoadingSignedUrlPath] = useState<string | null>(null);

  const handleOpenStorageFile = async (filePath?: string) => {
    if (!filePath) return;
    setLoadingSignedUrlPath(filePath);
    try {
      const signedUrl = await getStorageSignedUrl(filePath, 3600);
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Error opening signed URL:', err);
    } finally {
      setLoadingSignedUrlPath(null);
    }
  };

  // My Updates is an employee-owned submission history, regardless of role or subsidiary.
  const submissions: { doc: any; version: any }[] = [];
  (documents || []).forEach(doc => {
    if (!doc || !Array.isArray(doc.versions)) return;
    doc.versions.forEach(v => {
      if (!v || !v.uploadedBy) return;
      const isMySubmission =
        v.uploadedBy.id === currentUser.id ||
        (!v.uploadedBy.id && Boolean(v.uploadedBy.employeeId) && v.uploadedBy.employeeId === currentUser.employeeId);

      if (isMySubmission) {
        submissions.push({ doc, version: v });
      }
    });
  });

  return (
    <div id="my-updates-view" className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#141C2B] text-white border border-[#1E293B] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E] font-bold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4 text-[#C8892E]" />
            <span>Officer Submissions & Directorate Tracking</span>
          </div>
          <h2 className="font-serif font-bold text-2xl text-white">
            My Document Updates & Submissions
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Track statutory approval review progress, directorate notes, and version indexing states.
          </p>
        </div>

        <button
          onClick={() => setActiveView('knowledge')}
          className="px-4 py-2.5 bg-[#C8892E] hover:bg-[#B77A23] text-[#141C2B] text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Another Revision</span>
        </button>
      </div>

      {/* Submissions List */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#EFEBE2] flex items-center justify-between">
          <h3 className="font-serif font-bold text-base text-[#141C2B]">
            Submission History ({submissions.length} updates)
          </h3>
          <span className="text-xs font-mono text-[#64748B]">
            {currentUser.subsidiary} Division Officer Portal
          </span>
        </div>

        {submissions.length === 0 ? (
          <div className="p-12 text-center bg-[#FAF8F3]">
            <FileText className="w-10 h-10 text-[#8F9BAE] mx-auto mb-2" />
            <h4 className="font-serif font-bold text-base text-[#141C2B]">No Submissions Recorded Yet</h4>
            <p className="text-xs text-[#64748B] mt-1">
              Upload a technical document from the Knowledge Center to initiate the verification lifecycle.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#EFEBE2]">
            {submissions.map(({ doc, version }) => {
              const isApproved = version.approvalStatus === 'approved';
              const isPending = version.approvalStatus === 'pending';
              const isChangesRequested = version.approvalStatus === 'changes_requested';
              const isRejected = version.approvalStatus === 'rejected';

              return (
                <div key={version.id} className="p-5 hover:bg-[#FAF8F3] transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-[#F0FDF4] text-[#16A34A] px-2.5 py-1 rounded border border-[#BBF7D0]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved & Indexed in Knowledge Base</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-[#FEF3C7] text-[#92400E] px-2.5 py-1 rounded border border-[#FDE68A]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Under Central Directorate Review</span>
                        </span>
                      )}
                      {isChangesRequested && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-[#EFF6FF] text-[#1D4ED8] px-2.5 py-1 rounded border border-[#BFDBFE]">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Changes Requested by Admin</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-[#FEF2F2] text-[#DC2626] px-2.5 py-1 rounded border border-[#FECACA]">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejected</span>
                        </span>
                      )}

                      <span className="text-xs font-mono font-bold bg-[#EFEBE2] px-2 py-0.5 rounded text-[#141C2B]">
                        {doc.documentCode} v{version.versionNumber}.0
                      </span>
                    </div>

                    <div className="text-xs font-mono text-[#64748B]">
                      Submitted: {new Date(version.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-serif font-bold text-base text-[#141C2B]">{doc.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-[#64748B]">{version.fileName} ({version.fileSize || '12.4 MB'})</p>
                      {version.storageFilePath && (
                        <button
                          onClick={() => handleOpenStorageFile(version.storageFilePath)}
                          disabled={loadingSignedUrlPath === version.storageFilePath}
                          className="px-2 py-0.5 bg-[#EFEBE2] hover:bg-[#141C2B] hover:text-white text-[#141C2B] rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Generate signed URL to open storage object"
                        >
                          <ExternalLink className="w-2.5 h-2.5 text-[#C8892E]" />
                          <span>{loadingSignedUrlPath === version.storageFilePath ? 'Signing...' : 'View Storage File'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submission Context */}
                  <div className="p-3 bg-white rounded-lg border border-[#E4E0D6] text-xs text-[#334155]">
                    <span className="font-bold text-[#141C2B]">Reason for Change: </span>
                    <span>{version.reasonForChange}</span>
                  </div>

                  {/* Admin Feedback note if any */}
                  {version.changesRequestedNote && (
                    <div className="p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE] text-xs text-[#1E40AF] flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Directorate Feedback Note: </span>
                        <span>{version.changesRequestedNote}</span>
                      </div>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <span className="text-[11px] font-mono text-[#64748B]">
                      OCR Extraction Score: {version.ocrConfidence}%
                    </span>

                    <button
                      onClick={() => {
                        setActiveDocForDetail(doc);
                        setActiveView('knowledge');
                      }}
                      className="text-xs font-semibold text-[#C8892E] hover:underline flex items-center gap-1"
                    >
                      <span>View Full Document Timeline</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
