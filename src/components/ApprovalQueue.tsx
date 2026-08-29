import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Document, DocumentVersion, Subsidiary, ApprovalPriority, UserAccessRequest } from '../types';
import { getStorageSignedUrl } from '../services/supabaseDataService';
import { evaluateDocumentCompliance } from '../utils/complianceEngine';
import { 
  CheckSquare, 
  GitCompare, 
  Check, 
  X, 
  MessageSquare, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Filter, 
  Zap, 
  Sparkles, 
  ChevronRight,
  Database,
  Building2,
  Users,
  UserCheck,
  UserX,
  IdCard,
  Mail,
  ExternalLink,
  FileText,
  History,
  UserCheck2,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const ApprovalQueue: React.FC = () => {
  const { 
    documents, 
    currentUser, 
    approveVersion, 
    rejectVersion, 
    requestChangesVersion,
    bulkApproveRoutine,
    setCompareVersions,
    selectedSubsidiary,
    setSelectedSubsidiary,
    accessRequests,
    approveAccessRequest,
    rejectAccessRequest
  } = useApp();

  const [activeQueueTab, setActiveQueueTab] = useState<'pending' | 'access-requests'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [queueSubsidiaryFilter, setQueueSubsidiaryFilter] = useState<string>('ALL');
  const [selectedQueueItem, setSelectedQueueItem] = useState<{ doc: Document; version: DocumentVersion } | null>(null);
  const [actionModalType, setActionModalType] = useState<'approve' | 'reject' | 'changes' | null>(null);
  const [modalNote, setModalNote] = useState<string>('');

  // Reject access request modal state
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');
  const [loadingSignedUrlPath, setLoadingSignedUrlPath] = useState<string | null>(null);

  const handleOpenStorageFile = async (filePath?: string, fileName?: string) => {
    if (!filePath) return;
    setLoadingSignedUrlPath(filePath);
    try {
      const signedUrl = await getStorageSignedUrl(filePath, 3600);
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Failed to get signed URL:', err);
    } finally {
      setLoadingSignedUrlPath(null);
    }
  };

  // Collect pending approvals across all documents
  const pendingItems: { doc: Document; version: DocumentVersion }[] = [];

  (documents || []).forEach(doc => {
    if (!doc || !Array.isArray(doc.versions)) return;
    doc.versions.forEach(v => {
      if (v && v.approvalStatus === 'pending') {
        pendingItems.push({ doc, version: v });
      }
    });
  });

  const pendingAccessRequestsCount = accessRequests.filter(r => r.status === 'pending').length;

  const filteredPendingQueue = pendingItems.filter(item => {
    if (queueSubsidiaryFilter !== 'ALL' && item.doc.subsidiary !== queueSubsidiaryFilter) {
      return false;
    }
    if (priorityFilter !== 'ALL' && item.version.approvalPriority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const urgentCount = pendingItems.filter(p => p.version.approvalPriority === 'urgent').length;
  const normalCount = pendingItems.filter(p => p.version.approvalPriority === 'normal').length;
  const routineCount = pendingItems.filter(p => p.version.approvalPriority === 'routine' || !p.version.approvalPriority).length;

  const handleOpenActionModal = (item: { doc: Document; version: DocumentVersion }, type: 'approve' | 'reject' | 'changes') => {
    setSelectedQueueItem(item);
    setActionModalType(type);
    setModalNote('');
  };

  const handleExecuteModalAction = () => {
    if (!selectedQueueItem || !actionModalType) return;
    const { doc, version } = selectedQueueItem;

    if (actionModalType === 'approve') {
      approveVersion(doc.id, version.id, modalNote || 'Central Directorate Verification Approved');
    } else if (actionModalType === 'reject') {
      rejectVersion(doc.id, version.id, modalNote || 'Revision did not satisfy statutory baseline parameters.');
    } else if (actionModalType === 'changes') {
      requestChangesVersion(doc.id, version.id, modalNote || 'Please supply updated borehole logs and core sample assays.');
    }

    setActionModalType(null);
    setSelectedQueueItem(null);
  };

  return (
    <div id="approval-queue-view" className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner: Central Governance Directorate */}
      <div className="bg-[#141C2B] text-white border border-[#1E293B] rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E] font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[#4C7A52]" />
            <span>CMPDI Central Directorate Governance & Verification</span>
          </div>
          <h2 className="font-serif font-bold text-2xl text-white">
            Central Governance & Approval Queue
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Review and authorize technical document revisions and track organizational decision history.
          </p>
        </div>

        {/* Priority Summary & Bulk Routine Approve */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {activeQueueTab === 'pending' && (
            <button
              id="btn-queue-bulk-routine"
              onClick={() => bulkApproveRoutine()}
              className="px-4 py-2.5 bg-[#243147] hover:bg-[#334155] border border-[#334155] text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer"
              title="Approves all routine items; preserves urgent items for manual diff inspection"
            >
              <Zap className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Bulk Routine Approve</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs: Pending Submissions vs User Access Requests */}
      <div className="flex border-b border-[#E4E0D6] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveQueueTab('pending')}
          className={`pb-3 px-4 font-serif text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeQueueTab === 'pending'
              ? 'border-[#141C2B] text-[#141C2B]'
              : 'border-transparent text-[#64748B] hover:text-[#141C2B]'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Pending Submissions</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
            pendingItems.length > 0 ? 'bg-[#141C2B] text-white font-bold' : 'bg-[#E2E8F0] text-[#64748B]'
          }`}>
            {pendingItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveQueueTab('access-requests')}
          className={`pb-3 px-4 font-serif text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeQueueTab === 'access-requests'
              ? 'border-[#141C2B] text-[#141C2B]'
              : 'border-transparent text-[#64748B] hover:text-[#141C2B]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Access Requests</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
            pendingAccessRequestsCount > 0 ? 'bg-[#D97706] text-white font-bold animate-pulse' : 'bg-[#E2E8F0] text-[#64748B]'
          }`}>
            {pendingAccessRequestsCount}
          </span>
        </button>
      </div>

      {/* TAB 1: PENDING SUBMISSIONS */}
      {activeQueueTab === 'pending' && (
        <div className="space-y-5">
          {/* Filter Toolbar */}
          <div className="bg-white border border-[#E4E0D6] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-[#64748B] font-medium">
                <Filter className="w-3.5 h-3.5 text-[#C8892E]" />
                <span>Priority:</span>
              </div>

              <button
                onClick={() => setPriorityFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                  priorityFilter === 'ALL' ? 'bg-[#141C2B] text-white' : 'bg-[#FAF8F3] text-[#64748B] hover:bg-[#EFEBE2]'
                }`}
              >
                All ({pendingItems.length})
              </button>

              <button
                onClick={() => setPriorityFilter('urgent')}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                  priorityFilter === 'urgent' ? 'bg-[#DC2626] text-white' : 'bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
                <span>Urgent ({urgentCount})</span>
              </button>

              <button
                onClick={() => setPriorityFilter('normal')}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                  priorityFilter === 'normal' ? 'bg-[#D97706] text-white' : 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A]'
                }`}
              >
                Normal ({normalCount})
              </button>

              <button
                onClick={() => setPriorityFilter('routine')}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                  priorityFilter === 'routine' ? 'bg-[#16A34A] text-white' : 'bg-[#F0FDF4] text-[#166534] hover:bg-[#DCFCE7]'
                }`}
              >
                Routine ({routineCount})
              </button>

              <div className="h-4 w-px bg-[#E4E0D6] mx-1 hidden sm:block" />

              {/* Subsidiary filter dropdown */}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                <select
                  value={queueSubsidiaryFilter}
                  onChange={(e) => setQueueSubsidiaryFilter(e.target.value)}
                  className="bg-[#FAF8F3] border border-[#E4E0D6] text-[#141C2B] text-xs rounded-lg px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-[#C8892E] outline-none cursor-pointer"
                >
                  <option value="ALL">All Subsidiaries</option>
                  <option value="CMPDI HQ">CMPDI HQ</option>
                  <option value="BCCL">BCCL</option>
                  <option value="SECL">SECL</option>
                  <option value="ECL">ECL</option>
                  <option value="CCL">CCL</option>
                  <option value="WCL">WCL</option>
                  <option value="MCL">MCL</option>
                  <option value="NCL">NCL</option>
                </select>
              </div>
            </div>

            <span className="text-xs font-mono text-[#64748B]">
              Showing {filteredPendingQueue.length} of {pendingItems.length}
            </span>
          </div>

          {/* Pending Submissions List */}
          <div className="bg-white border border-[#E4E0D6] rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#EFEBE2] flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-[#141C2B]">
                Pending Submissions for Re-Indexing
              </h3>
              <span className="text-xs font-mono text-[#64748B]">
                {filteredPendingQueue.length} items awaiting review
              </span>
            </div>

            {filteredPendingQueue.length === 0 ? (
              <div className="p-12 text-center bg-[#FAF8F3]">
                <CheckSquare className="w-10 h-10 text-[#16A34A] mx-auto mb-2" />
                <h4 className="font-serif font-bold text-base text-[#141C2B]">All Submissions Verified</h4>
                <p className="text-xs text-[#64748B] mt-1">
                  There are no pending documents in the approval queue for the selected filters.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#EFEBE2]">
                {filteredPendingQueue.map(({ doc, version }) => {
                  const isUrgent = version.approvalPriority === 'urgent';
                  const previousVersion = doc.versions.find(v => v.versionNumber === version.versionNumber - 1) || doc.versions[1] || doc.versions[0];
                  const aiEval = evaluateDocumentCompliance(doc, version);

                  return (
                    <div 
                      key={version.id}
                      id={`queue-item-${doc.id}`}
                      data-doc-id={doc.id}
                      data-doc-code={doc.documentCode}
                      data-version-id={version.id}
                      className={`p-5 transition-all ${
                        aiEval.categoryMismatch 
                          ? 'bg-[#FEF2F2]/40 border-l-4 border-l-[#DC2626]' 
                          : isUrgent 
                          ? 'bg-[#FFFBFB] border-l-4 border-l-[#DC2626]' 
                          : 'hover:bg-[#FAF8F3]'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                        {/* Left: Metadata & Titles */}
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Priority Badge */}
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isUrgent 
                                ? 'bg-[#DC2626] text-white animate-pulse' 
                                : version.approvalPriority === 'normal'
                                  ? 'bg-[#FEF3C7] text-[#92400E]'
                                  : 'bg-[#F0FDF4] text-[#166534]'
                            }`}>
                              {isUrgent ? '🔴 Urgent' : version.approvalPriority === 'normal' ? '🟡 Normal' : '🟢 Routine'}
                            </span>

                            {/* Category Mismatch Pill */}
                            {aiEval.categoryMismatch && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-[#DC2626] text-white flex items-center gap-1 shadow-2xs">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Category Mismatch: Unrelated Content</span>
                              </span>
                            )}

                            <span className="font-mono text-xs font-bold bg-[#EFEBE2] px-2 py-0.5 rounded text-[#141C2B]">
                              {doc.documentCode}
                            </span>

                            <span className="text-xs font-mono text-[#64748B]">
                              Target: v{version.versionNumber}.0 (Revising v{previousVersion ? previousVersion.versionNumber : 1}.0)
                            </span>

                            <span className="text-[11px] font-mono font-semibold bg-[#FAF8F3] px-2 py-0.5 rounded border border-[#E4E0D6] text-[#141C2B]">
                              {doc.subsidiary}
                            </span>

                            {/* Compliance Score Badges */}
                            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                              aiEval.overallScore >= 80 
                                ? 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]' 
                                : aiEval.overallScore >= 60 
                                ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]' 
                                : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                            }`}>
                              Compliance: {aiEval.overallScore}% (Fmt: {aiEval.formatScore}% · Cont: {aiEval.contentScore}%)
                            </span>
                          </div>

                          <h4 className="font-serif font-bold text-base text-[#141C2B]">
                            {doc.title}
                          </h4>

                          {/* Category Mismatch Alert */}
                          {aiEval.categoryMismatch && (
                            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#991B1B] space-y-1.5">
                              <div className="flex items-center gap-1.5 font-bold">
                                <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
                                <span>Subject Matter Unrelated to {doc.type.replace(/_/g, ' ')} for {doc.subsidiary}</span>
                              </div>
                              <p className="text-[11px] leading-relaxed text-[#7F1D1D]">
                                Detected subject matter: <strong className="font-mono text-[#DC2626]">{aiEval.detectedSubject}</strong> (Expected: <strong className="font-mono text-[#15803D]">{aiEval.expectedCategory}</strong>). Approval is locked to prevent non-mining data indexing.
                              </p>
                            </div>
                          )}

                          {/* Submitter & Timeline Step Box */}
                          <div className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg p-3 space-y-2 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFEBE2] pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#141C2B]">Step 1: Submitted by:</span>
                                <span className="font-semibold text-[#141C2B]">{version.uploadedBy.name}</span>
                                <span className="text-[#64748B] font-mono">({version.uploadedBy.employeeId || 'EMP-01'} • {version.uploadedBy.subsidiary})</span>
                              </div>
                              <div className="flex items-center gap-1 text-[#64748B] font-mono text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-[#8F9BAE]" />
                                <span>{new Date(version.uploadedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>

                            <div className="text-[#334155]">
                              <span className="font-semibold text-[#141C2B]">Submission Reason: </span>
                              <span>{version.reasonForChange}</span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
                              <span className="flex items-center gap-1 font-mono">
                                File: <strong className="text-[#141C2B]">{version.fileName}</strong> ({version.fileSize || '14.2 MB'})
                              </span>
                              {version.storageFilePath && (
                                <button
                                  onClick={() => handleOpenStorageFile(version.storageFilePath, version.fileName)}
                                  disabled={loadingSignedUrlPath === version.storageFilePath}
                                  className="px-2 py-0.5 bg-[#EFEBE2] hover:bg-[#141C2B] hover:text-white text-[#141C2B] rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 text-[#C8892E]" />
                                  <span>{loadingSignedUrlPath === version.storageFilePath ? 'Signing...' : 'View Storage File'}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* AI Risk Reasoning if urgent */}
                          {version.aiRiskReason && !aiEval.categoryMismatch && (
                            <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#991B1B] flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">AI Governance Analysis: </span>
                                <span>{version.aiRiskReason}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-col gap-2 flex-shrink-0 min-w-[200px]">
                          {/* Compare Diff Button */}
                          <button
                            id={`btn-compare-diff-${version.id}`}
                            onClick={() => setCompareVersions({ v1: previousVersion, v2: version, doc })}
                            className="px-3 py-2 bg-[#141C2B] hover:bg-[#1E293B] text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-xs w-full cursor-pointer"
                          >
                            <GitCompare className="w-3.5 h-3.5 text-[#C8892E]" />
                            <span>
                              {version.versionNumber === 1 || !previousVersion || previousVersion.id === version.id
                                ? 'Review & Benchmark Compare' 
                                : 'Compare Side-by-Side Diff'}
                            </span>
                          </button>

                          {/* Action Row */}
                          <div className="flex items-center gap-2 w-full">
                            <button
                              id={`btn-approve-${version.id}`}
                              onClick={() => handleOpenActionModal({ doc, version }, 'approve')}
                              disabled={aiEval.categoryMismatch}
                              className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                                aiEval.categoryMismatch 
                                  ? 'bg-[#94A3B8] text-white cursor-not-allowed opacity-60' 
                                  : 'bg-[#16A34A] hover:bg-[#15803D] text-white'
                              }`}
                              title={aiEval.categoryMismatch ? "Cannot approve: Document content does not match category" : "Approve and reindex chunk into knowledge base"}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => handleOpenActionModal({ doc, version }, 'changes')}
                              className="px-3 py-2 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] text-xs font-semibold text-[#141C2B] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Request changes / ask for more data"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#C8892E]" />
                              <span>Request Changes</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: USER ACCESS REQUESTS */}
      {activeQueueTab === 'access-requests' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EFEBE2]">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#141C2B]">
                  Organizational Access Requests & Verification
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Authorize or reject employee registration requests for MineMind AI knowledge and reporting workstations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-2.5 py-1 rounded-full font-bold">
                  {pendingAccessRequestsCount} Pending Review
                </span>
              </div>
            </div>

            {accessRequests.length === 0 ? (
              <div className="p-12 text-center bg-[#FAF8F3]">
                <Users className="w-10 h-10 text-[#64748B] mx-auto mb-2" />
                <h4 className="font-serif font-bold text-base text-[#141C2B]">No Access Requests</h4>
                <p className="text-xs text-[#64748B] mt-1">
                  There are currently no access requests recorded in the system.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#EFEBE2] mt-2">
                {accessRequests.map((req) => (
                  <div key={req.id} className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          req.status === 'pending'
                            ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                            : req.status === 'approved'
                              ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
                              : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                        }`}>
                          {req.status === 'pending' ? '🟡 Pending Approval' : req.status === 'approved' ? '🟢 Approved' : '🔴 Rejected'}
                        </span>

                        <span className="font-mono text-xs font-bold bg-[#EFEBE2] px-2 py-0.5 rounded text-[#141C2B]">
                          {req.employeeId}
                        </span>

                        <span className="text-xs font-mono text-[#64748B]">
                          Ref: {req.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <h4 className="font-serif font-bold text-base text-[#141C2B]">
                          {req.name}
                        </h4>
                        <span className="text-xs text-[#64748B]">({req.designation})</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
                        <span className="flex items-center gap-1 font-semibold text-[#141C2B]">
                          <Building2 className="w-3.5 h-3.5 text-[#8F9BAE]" />
                          {req.subsidiary} — {req.department}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[#475569]">
                          <Mail className="w-3.5 h-3.5 text-[#8F9BAE]" />
                          {req.email}
                        </span>
                        <span className="text-[11px] font-mono text-[#94A3B8]">
                          Requested: {new Date(req.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {req.rejectedReason && (
                        <div className="p-2 bg-[#FEF2F2] border border-[#FECACA] text-[11px] text-[#991B1B] rounded-lg mt-1">
                          <strong>Rejection Reason:</strong> {req.rejectedReason}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveAccessRequest(req.id)}
                            className="px-3.5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Approve Access</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectingRequestId(req.id);
                              setRejectReasonInput('Designation or subsidiary clearance needs verification with Area GM.');
                            }}
                            className="px-3.5 py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-xs font-semibold text-[#DC2626] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserX className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {req.status === 'approved' && (
                        <span className="text-xs font-semibold text-[#166534] bg-[#F0FDF4] px-3 py-1.5 rounded-lg border border-[#BBF7D0] flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                          <span>Active Account</span>
                        </span>
                      )}

                      {req.status === 'rejected' && (
                        <button
                          onClick={() => approveAccessRequest(req.id)}
                          className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] text-xs font-semibold text-[#141C2B] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>Re-approve</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Access Request Modal */}
      {rejectingRequestId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#E4E0D6] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE2]">
              <h3 className="font-serif font-bold text-lg text-[#DC2626] flex items-center gap-2">
                <UserX className="w-5 h-5" />
                <span>Reject Access Request</span>
              </h3>
              <button onClick={() => setRejectingRequestId(null)} className="text-[#64748B] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141C2B] mb-1.5">
                Official Rejection Reason (Dispatched to applicant):
              </label>
              <textarea
                rows={3}
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="Specify reason for rejecting access request..."
                className="w-full p-2.5 bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EFEBE2]">
              <button
                onClick={() => setRejectingRequestId(null)}
                className="px-4 py-2 bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg hover:bg-[#D4CEBF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  rejectAccessRequest(rejectingRequestId, rejectReasonInput);
                  setRejectingRequestId(null);
                }}
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Approve / Reject / Changes Requested) */}
      {actionModalType && selectedQueueItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-[#E4E0D6] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE2]">
              <h3 className="font-serif font-bold text-lg text-[#141C2B] capitalize">
                {actionModalType === 'approve' && 'Approve & Re-Index Revision'}
                {actionModalType === 'reject' && 'Reject Technical Submission'}
                {actionModalType === 'changes' && 'Request Revision Changes'}
              </h3>
              <button onClick={() => setActionModalType(null)} className="text-[#64748B] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#475569] space-y-2">
              <p>
                <strong>Document:</strong> {selectedQueueItem.doc.title} ({selectedQueueItem.doc.documentCode} v{selectedQueueItem.version.versionNumber}.0)
              </p>
              <p>
                <strong>Submitting Officer:</strong> {selectedQueueItem.version.uploadedBy.name} ({selectedQueueItem.version.uploadedBy.subsidiary} • {selectedQueueItem.version.uploadedBy.employeeId || 'EMP-01'})
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#141C2B]">
                  {actionModalType === 'approve' ? 'Sign-Off Directorate Note / Justification:' : 'Detailed Statutory Feedback / Directives:'}
                </label>
                {actionModalType === 'changes' && modalNote && (
                  <button
                    type="button"
                    onClick={() => setModalNote('')}
                    className="text-[10px] text-[#DC2626] hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {actionModalType === 'changes' && (
                <div className="mb-2 p-2.5 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#141C2B] flex items-center gap-1 uppercase">
                      <Sparkles className="w-3 h-3 text-[#C8892E]" />
                      AI Templates & Presets:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const v = selectedQueueItem.version;
                        const d = selectedQueueItem.doc;
                        const evalResult = evaluateDocumentCompliance(d, v);
                        setModalNote(evalResult.suggestedActionDirective);
                      }}
                      className="px-2 py-0.5 bg-[#141C2B] hover:bg-[#1E293B] text-white text-[10px] font-bold font-mono rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-[#E2B13C]" />
                      <span>Auto-Draft with AI</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const evalResult = evaluateDocumentCompliance(selectedQueueItem.doc, selectedQueueItem.version);
                      const presets = [];
                      if (evalResult.categoryMismatch) {
                        presets.push({
                          l: '⚠️ Category Mismatch Notice',
                          t: `Category Mismatch: The submitted file "${selectedQueueItem.version.fileName || selectedQueueItem.doc.title}" contains subject matter (${evalResult.detectedSubject}) unrelated to statutory mining category (${selectedQueueItem.doc.type.replace(/_/g, ' ')}). Please provide the authorized statutory filing or amend filing classification.`
                        });
                      }
                      presets.push(
                        { l: '📊 Overburden Cross-Section', t: 'Please furnish updated Seam-IV overburden geological cross-sections and calibrate stripping ratio assays.' },
                        { l: '✍️ Missing DGMS Sign-off', t: `Please ensure this filing includes authorized digital endorsement from the ${selectedQueueItem.doc.subsidiary} Area Safety Officer.` },
                        { l: '🌱 EMP Clearance Memo', t: 'Please attach the corresponding Environmental Management Plan (EMP) clearance certificate.' },
                        { l: '🔬 Proximate Assays', t: 'Observed variance in proximate analysis. Kindly calibrate ash and moisture percentages with CMPDI lab assay reports.' }
                      );
                      return presets.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setModalNote(item.t)}
                          className="text-[10px] bg-white hover:bg-[#F3EFE6] text-[#334155] border border-[#E2DDD2] hover:border-[#C8892E] rounded px-2 py-0.5 cursor-pointer text-left transition-all"
                        >
                          {item.l}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              <textarea
                rows={3}
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                placeholder={
                  actionModalType === 'approve'
                    ? 'e.g. Verified against CMPDI Central Borehole Log Database. Approved for live RAG synthesis.'
                    : 'Click a preset above or type specific revision instructions for the officer...'
                }
                className="w-full p-3 bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg text-xs"
              />
            </div>

            {actionModalType === 'approve' && (
              <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-xs text-[#166534] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                <span>
                  Approving will automatically re-index the AI Knowledge Base chunks and update topic models.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEBE2]">
              <button
                onClick={() => setActionModalType(null)}
                className="px-4 py-2 bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg hover:bg-[#D4CEBF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-modal-action"
                onClick={handleExecuteModalAction}
                className={`px-5 py-2 text-white text-xs font-bold rounded-lg cursor-pointer ${
                  actionModalType === 'approve' 
                    ? 'bg-[#16A34A] hover:bg-[#15803D]' 
                    : actionModalType === 'reject'
                      ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                      : 'bg-[#141C2B] hover:bg-[#1E293B]'
                }`}
              >
                Confirm {actionModalType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
