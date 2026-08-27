import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Document, DocumentVersion, DocumentType, Subsidiary } from '../types';
import { 
  Search, 
  Filter, 
  Upload, 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Layers, 
  FileCheck2, 
  Eye, 
  GitCompare, 
  ChevronRight, 
  FileUp, 
  X, 
  Sparkles,
  ArrowRight,
  Database,
  Building2,
  Table as TableIcon,
  DownloadCloud,
  HardDrive,
  Wifi,
  WifiOff,
  Check,
  Bookmark
} from 'lucide-react';

export const KnowledgeCenter: React.FC = () => {
  const { 
    documents, 
    currentUser, 
    addDocument, 
    submitNewVersion, 
    activeDocForDetail, 
    setActiveDocForDetail,
    setCompareVersions,
    selectedSubsidiary,
    knowledgeSearchTerm,
    setKnowledgeSearchTerm,
    activeTopicFilter,
    setActiveTopicFilter,
    isUndergroundModeActive,
    cachedDocumentIds,
    toggleCacheDocumentOffline,
    precacheAllDocumentsForUnderground,
    lastOfflineSyncTime
  } = useApp();

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showOfflineOnly, setShowOfflineOnly] = useState<boolean>(false);
  
  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isUpdateFlow, setIsUpdateFlow] = useState<boolean>(false);
  const [targetDocForUpdate, setTargetDocForUpdate] = useState<Document | null>(null);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadDocCode, setUploadDocCode] = useState<string>('');
  const [uploadSubsidiary, setUploadSubsidiary] = useState<Subsidiary>(currentUser.subsidiary);
  const [uploadType, setUploadType] = useState<DocumentType>('geological_report');
  const [uploadReason, setUploadReason] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadTextContent, setUploadTextContent] = useState<string>('');

  // OCR Processing Simulation Stages: 1. Uploaded -> 2. OCR -> 3. Table Extraction -> 4. Cleaning -> 5. Indexed
  const [ocrStep, setOcrStep] = useState<number>(0);
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Filtered documents
  const filteredDocs = documents.filter(doc => {
    // Subsidiary filter
    if (selectedSubsidiary !== 'ALL' && doc.subsidiary !== selectedSubsidiary && doc.subsidiary !== 'CMPDI HQ') {
      return false;
    }
    // Type filter
    if (typeFilter !== 'ALL' && doc.type !== typeFilter) {
      return false;
    }
    // Status filter
    if (statusFilter !== 'ALL' && doc.status !== statusFilter) {
      return false;
    }
    // Offline filter
    if (showOfflineOnly && !cachedDocumentIds.includes(doc.id)) {
      return false;
    }
    // Search term filter
    const query = knowledgeSearchTerm.toLowerCase();
    if (query) {
      const matchTitle = doc.title.toLowerCase().includes(query);
      const matchCode = doc.documentCode.toLowerCase().includes(query);
      const matchTags = doc.tags.some(t => t.toLowerCase().includes(query));
      const matchText = doc.versions.some(v => v.extractedText.toLowerCase().includes(query));
      if (!matchTitle && !matchCode && !matchTags && !matchText) {
        return false;
      }
    }
    // Topic filter from AI Insights
    if (activeTopicFilter) {
      const topicLower = activeTopicFilter.toLowerCase();
      const matchTopic = doc.tags.some(t => t.toLowerCase().includes(topicLower)) || 
                         doc.title.toLowerCase().includes(topicLower);
      if (!matchTopic) return false;
    }
    return true;
  });


  const handleOpenUpload = (isUpdate = false, doc?: Document) => {
    setIsUpdateFlow(isUpdate);
    setTargetDocForUpdate(doc || null);
    if (isUpdate && doc) {
      setUploadTitle(doc.title);
      setUploadDocCode(doc.documentCode);
      setUploadSubsidiary(doc.subsidiary);
      setUploadType(doc.type);
      setUploadReason('');
      setUploadFileName(`${doc.title.split(' ')[0]}_Revision_v${doc.versions.length + 1}.pdf`);
      setUploadTextContent(doc.versions[0]?.extractedText || '');
    } else {
      setUploadTitle('');
      setUploadDocCode(`CMPDI/GEO/${new Date().getFullYear()}/${currentUser.subsidiary}-${Math.floor(100 + Math.random() * 900)}`);
      setUploadSubsidiary(currentUser.subsidiary);
      setUploadType('geological_report');
      setUploadReason('Initial baseline exploration and reserve assessment submission.');
      setUploadFileName('');
      setUploadTextContent('');
    }
    setOcrStep(0);
    setIsProcessingOcr(false);
    setDuplicateWarning(null);
    setIsUploadModalOpen(true);
  };

  const handleFileDrop = (fileName: string, sampleText: string) => {
    setUploadFileName(fileName);
    setUploadTextContent(sampleText);

    // Duplicate detection check
    const existingDuplicate = documents.find(d => 
      d.title.toLowerCase() === uploadTitle.toLowerCase() || 
      d.versions.some(v => v.fileName.toLowerCase() === fileName.toLowerCase())
    );
    if (existingDuplicate) {
      setDuplicateWarning(`Possible duplicate detected — matches existing approved filing "${existingDuplicate.title}" (${existingDuplicate.documentCode}).`);
    } else {
      setDuplicateWarning(null);
    }
  };

  const startOcrPipeline = async () => {
    if (!uploadFileName || !uploadReason) return;
    setIsProcessingOcr(true);
    setOcrStep(1); // Uploaded & Validated

    await new Promise(r => setTimeout(r, 600));
    setOcrStep(2); // Optical Character Recognition

    await new Promise(r => setTimeout(r, 700));
    setOcrStep(3); // Tabular Extraction & Seam Coordinates

    await new Promise(r => setTimeout(r, 600));
    setOcrStep(4); // Text Cleaning & Data Normalization

    await new Promise(r => setTimeout(r, 500));
    setOcrStep(5); // Vector Index Prep Ready

    await new Promise(r => setTimeout(r, 400));
    setIsProcessingOcr(false);

    if (isUpdateFlow && targetDocForUpdate) {
      const nextVerNum = targetDocForUpdate.versions.length + 1;
      const newVersion: DocumentVersion = {
        id: `ver_${Date.now()}`,
        documentId: targetDocForUpdate.id,
        versionNumber: nextVerNum,
        fileName: uploadFileName,
        fileSize: '12.4 MB',
        reasonForChange: uploadReason,
        uploadedBy: {
          id: currentUser.id,
          name: currentUser.name,
          employeeId: currentUser.employeeId,
          subsidiary: currentUser.subsidiary,
        },
        uploadedAt: new Date().toISOString(),
        approvalStatus: 'pending',
        approvalPriority: uploadReason.toLowerCase().includes('variance') || uploadReason.toLowerCase().includes('amendment') ? 'urgent' : 'normal',
        aiRiskReason: uploadReason.toLowerCase().includes('variance') 
          ? 'AI Flag: Proposed update introduces numerical deviation on production/reserve parameters.'
          : undefined,
        extractedText: uploadTextContent || `Updated technical filing submitted for ${targetDocForUpdate.title}. Reason: ${uploadReason}`,
        ocrConfidence: 99.4,
      };

      submitNewVersion(targetDocForUpdate.id, newVersion);
    } else {
      const newDocId = `doc_${Date.now()}`;
      const newVersion: DocumentVersion = {
        id: `ver_${Date.now()}`,
        documentId: newDocId,
        versionNumber: 1,
        fileName: uploadFileName,
        fileSize: '15.8 MB',
        reasonForChange: uploadReason || 'Initial baseline exploration upload',
        uploadedBy: {
          id: currentUser.id,
          name: currentUser.name,
          employeeId: currentUser.employeeId,
          subsidiary: currentUser.subsidiary,
        },
        uploadedAt: new Date().toISOString(),
        approvalStatus: 'pending',
        approvalPriority: 'normal',
        extractedText: uploadTextContent || `Exploration dataset submitted for ${uploadTitle}.`,
        ocrConfidence: 98.8,
      };

      const newDoc: Document = {
        id: newDocId,
        title: uploadTitle || 'New CMPDI Technical Filing',
        documentCode: uploadDocCode,
        subsidiary: uploadSubsidiary,
        type: uploadType,
        department: 'Exploration & Mine Planning',
        currentVersionId: newVersion.id,
        versions: [newVersion],
        tags: [uploadType.replace('_', ' '), uploadSubsidiary, 'Exploration'],
        status: 'pending',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      addDocument(newDoc);
    }

    setIsUploadModalOpen(false);
  };

  return (
    <div id="knowledge-center-view" className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Active Topic Filter Clear Banner */}
      {activeTopicFilter && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] p-3 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C8892E]" />
            <span>Filtering documents by AI Topic Cluster: <strong>"{activeTopicFilter}"</strong></span>
          </div>
          <button
            onClick={() => setActiveTopicFilter(null)}
            className="font-bold underline hover:text-[#78350F]"
          >
            Clear Topic Filter
          </button>
        </div>
      )}

      {/* Underground Mining Pre-cache Status Banner */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#FAF8F3] border border-[#E4E0D6] flex items-center justify-center flex-shrink-0">
            <HardDrive className="w-5 h-5 text-[#C8892E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-sm text-[#141C2B]">
                Underground Pit & Shaft Cache (Service Worker)
              </h3>
              <span className="font-mono text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] px-2 py-0.5 rounded">
                {cachedDocumentIds.length} of {documents.length} Docs Offline Ready
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Pre-cache geological sheets, borehole tables & safety SOPs to browse and query inside deep mine pits without internet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            id="btn-filter-offline-only"
            onClick={() => setShowOfflineOnly(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              showOfflineOnly 
                ? 'bg-[#141C2B] text-white border-[#141C2B]' 
                : 'bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] border-[#E4E0D6]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-[#C8892E]" />
            <span>{showOfflineOnly ? 'Showing Offline Only' : 'Filter Offline Only'}</span>
          </button>

          <button
            id="btn-precache-all-kc"
            onClick={precacheAllDocumentsForUnderground}
            className="px-3.5 py-1.5 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-[#86EFAC]" />
            <span>Pre-cache All for Underground</span>
          </button>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Full text search */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
            <input
              type="text"
              placeholder="Search document title, code, seam, or borehole parameters..."
              value={knowledgeSearchTerm}
              onChange={(e) => setKnowledgeSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] text-[#141C2B]"
            />
            {knowledgeSearchTerm && (
              <button 
                onClick={() => setKnowledgeSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8F9BAE] hover:text-[#141C2B]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <Filter className="w-3.5 h-3.5 text-[#C8892E]" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg px-2.5 py-1.5 text-xs text-[#141C2B] font-medium focus:outline-none"
            >
              <option value="ALL">All Document Types</option>
              <option value="geological_report">Geological Reports</option>
              <option value="safety_sop">Safety SOPs</option>
              <option value="production_sheet">Production Sheets</option>
              <option value="mine_plan">Mine Plans</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg px-2.5 py-1.5 text-xs text-[#141C2B] font-medium focus:outline-none"
          >
            <option value="ALL">All Approval Statuses</option>
            <option value="approved">Approved & Indexed</option>
            <option value="pending">Pending Central Review</option>
          </select>
        </div>

        {/* Upload Button */}
        <button
          id="btn-open-upload-modal"
          onClick={() => handleOpenUpload(false)}
          className="px-4 py-2 bg-[#141C2B] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shadow-xs flex-shrink-0"
        >
          <Upload className="w-3.5 h-3.5 text-[#C8892E]" />
          <span>Upload New Document</span>
        </button>
      </div>

      {/* Documents Results Scan Table (Strictly List/Table layout as officers scan quickly) */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#EFEBE2] flex items-center justify-between">
          <div className="text-xs font-semibold text-[#141C2B] flex items-center gap-2">
            <span>Governed Records Catalog</span>
            <span className="font-mono text-[11px] bg-[#EFEBE2] px-2 py-0.5 rounded text-[#64748B]">
              {filteredDocs.length} matching files
            </span>
          </div>
          <span className="text-[11px] text-[#64748B] font-mono">
            Controlled Knowledge Updating Protocol
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#E4E0D6] text-[#64748B] font-mono text-[11px]">
                <th className="py-3 px-4 font-semibold">Document Code & Title</th>
                <th className="py-3 px-4 font-semibold">Subsidiary</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Current Version</th>
                <th className="py-3 px-4 font-semibold">Approval Status</th>
                <th className="py-3 px-4 font-semibold">Underground Cache</th>
                <th className="py-3 px-4 font-semibold">Last Updated</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE2]">
              {filteredDocs.map((doc) => {
                const currentVer = doc.versions.find(v => v.id === doc.currentVersionId) || doc.versions[0];
                const isDocCached = cachedDocumentIds.includes(doc.id);

                return (
                  <tr 
                    key={doc.id}
                    className="hover:bg-[#FDFBF7] transition-colors group cursor-pointer"
                    onClick={() => setActiveDocForDetail(doc)}
                  >
                    {/* Title & Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-4 h-4 text-[#C8892E] flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-[#141C2B] group-hover:text-[#C8892E] transition-colors line-clamp-1">
                            {doc.title}
                          </div>
                          <div className="font-mono text-[10px] text-[#64748B] mt-0.5">
                            {doc.documentCode} · {doc.department}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Subsidiary */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#141C2B]">
                      <span className="bg-[#EFEBE2] px-2 py-0.5 rounded text-[11px]">
                        {doc.subsidiary}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 text-[#475569] capitalize">
                      {doc.type.replace('_', ' ')}
                    </td>

                    {/* Current Version */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#141C2B]">v{currentVer.versionNumber}.0</span>
                        <span className="text-[10px] text-[#64748B]">({doc.versions.length} total)</span>
                      </div>
                    </td>

                    {/* Approval Status */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {doc.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded font-bold border border-[#BBF7D0]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Approved & Indexed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded font-bold border border-[#FDE68A]">
                          <Clock className="w-3 h-3" />
                          <span>Revision Pending</span>
                        </span>
                      )}
                    </td>

                    {/* Underground Offline Cache Status */}
                    <td className="py-3.5 px-4 font-mono text-[11px]" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleCacheDocumentOffline(doc.id)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                          isDocCached 
                            ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0] hover:bg-[#DCFCE7]' 
                            : 'bg-[#FAF8F3] text-[#64748B] border-[#E4E0D6] hover:bg-[#EFEBE2]'
                        }`}
                        title={isDocCached ? 'Stored in Service Worker Cache (Click to remove)' : 'Click to save for underground offline viewing'}
                      >
                        {isDocCached ? (
                          <>
                            <Check className="w-3 h-3 text-[#16A34A]" />
                            <span>Cached Offline</span>
                          </>
                        ) : (
                          <>
                            <DownloadCloud className="w-3 h-3 text-[#64748B]" />
                            <span>Save Offline</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Last Updated */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#64748B]">
                      {new Date(doc.lastUpdated).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenUpload(true, doc)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#141C2B] bg-[#EFEBE2] hover:bg-[#C8892E] hover:text-white rounded transition-colors flex items-center gap-1"
                          title="Submit a controlled revision/update to this document"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Submit Update</span>
                        </button>
                        <button
                          onClick={() => setActiveDocForDetail(doc)}
                          className="p-1 text-[#64748B] hover:text-[#141C2B] hover:bg-[#FAF8F3] rounded"
                          title="View Details & Version History"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Detail Drawer / Modal (When activeDocForDetail is set) */}
      {activeDocForDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E4E0D6] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-[#141C2B] text-white flex items-center justify-between border-b border-[#1E293B]">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E]">
                  <span>{activeDocForDetail.documentCode}</span>
                  <span>·</span>
                  <span>{activeDocForDetail.subsidiary}</span>
                  {cachedDocumentIds.includes(activeDocForDetail.id) && (
                    <span className="bg-[#166534] text-[#86EFAC] text-[10px] px-2 py-0.2 rounded font-bold">
                      OFFLINE READY
                    </span>
                  )}
                </div>
                <h3 className="font-serif font-bold text-xl text-white mt-1">
                  {activeDocForDetail.title}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleCacheDocumentOffline(activeDocForDetail.id)}
                  className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs rounded-lg text-white font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5 text-[#C8892E]" />
                  <span>{cachedDocumentIds.includes(activeDocForDetail.id) ? 'Cached Offline' : 'Cache for Offline'}</span>
                </button>
                <button
                  onClick={() => setActiveDocForDetail(null)}
                  className="text-[#94A3B8] hover:text-white p-1 rounded cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#F7F5F0]">
              {/* Document Overview */}
              <div className="bg-white p-4 rounded-lg border border-[#E4E0D6] flex flex-wrap gap-4 text-xs">
                <div>
                  <span className="text-[#64748B]">Department:</span>{' '}
                  <span className="font-semibold text-[#141C2B]">{activeDocForDetail.department}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Document Type:</span>{' '}
                  <span className="font-semibold text-[#141C2B] capitalize">{activeDocForDetail.type.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Governed Status:</span>{' '}
                  <span className="font-mono font-bold text-[#16A34A]">Approved & Active</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Underground Availability:</span>{' '}
                  <span className={`font-mono font-bold ${cachedDocumentIds.includes(activeDocForDetail.id) ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                    {cachedDocumentIds.includes(activeDocForDetail.id) ? 'Stored in Service Worker' : 'Cloud Only'}
                  </span>
                </div>
              </div>

              {/* Version Timeline (v1 -> v2 -> v3) - Section 5.4 Spec */}
              <div className="bg-white p-5 rounded-lg border border-[#E4E0D6]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#EFEBE2]">
                  <h4 className="font-serif font-bold text-base text-[#141C2B] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#C8892E]" />
                    <span>Append-Only Version Timeline</span>
                  </h4>
                  <span className="text-[11px] font-mono text-[#64748B]">
                    {activeDocForDetail.versions.length} recorded versions
                  </span>
                </div>

                <div className="space-y-4">
                  {activeDocForDetail.versions.map((ver, idx) => {
                    const isCurrent = ver.id === activeDocForDetail.currentVersionId;

                    return (
                      <div 
                        key={ver.id}
                        className={`p-4 rounded-lg border transition-all ${
                          isCurrent 
                            ? 'bg-[#FAF8F3] border-[#C8892E]' 
                            : 'bg-white border-[#E4E0D6]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              isCurrent ? 'bg-[#141C2B] text-[#C8892E]' : 'bg-[#EFEBE2] text-[#141C2B]'
                            }`}>
                              Version {ver.versionNumber}.0 {isCurrent && '(CURRENT ACTIVE)'}
                            </span>
                            <span className="text-[11px] font-mono text-[#64748B]">
                              Uploaded: {new Date(ver.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              ver.approvalStatus === 'approved' 
                                ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]' 
                                : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                            }`}>
                              {ver.approvalStatus.toUpperCase()}
                            </span>

                            {/* Side-by-side compare button if previous version exists */}
                            {idx < activeDocForDetail.versions.length - 1 && (
                              <button
                                onClick={() => {
                                  const olderVer = activeDocForDetail.versions[idx + 1];
                                  setCompareVersions({
                                    v1: olderVer,
                                    v2: ver,
                                    doc: activeDocForDetail,
                                  });
                                }}
                                className="px-2 py-1 text-[10px] font-mono font-bold bg-[#141C2B] text-white hover:bg-[#1E293B] rounded flex items-center gap-1"
                              >
                                <GitCompare className="w-3 h-3 text-[#C8892E]" />
                                <span>Compare vs v{activeDocForDetail.versions[idx + 1].versionNumber}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reason for change */}
                        <div className="text-xs text-[#334155] mb-2 bg-white p-2.5 rounded border border-[#E4E0D6]">
                          <span className="font-bold text-[#141C2B]">Reason for Change: </span>
                          <span>{ver.reasonForChange}</span>
                        </div>

                        {/* Key metrics if available */}
                        {ver.keyMetrics && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 text-[11px] font-mono">
                            {ver.keyMetrics.map((km, i) => (
                              <div key={i} className="p-2 bg-[#FAF8F3] rounded border border-[#EFEBE2]">
                                <span className="text-[#64748B] block text-[10px]">{km.label}</span>
                                <span className="font-bold text-[#141C2B]">{km.value}</span>
                                {km.variance && (
                                  <span className="block text-[9px] text-[#C8892E] font-semibold">{km.variance}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Extracted text snippet */}
                        <p className="text-xs text-[#475569] leading-relaxed bg-[#FAF8F3] p-2.5 rounded font-mono text-[11px]">
                          {ver.extractedText}
                        </p>

                        <div className="mt-2 text-[10px] font-mono text-[#64748B] flex items-center justify-between">
                          <span>Uploader: {ver.uploadedBy.name} ({ver.uploadedBy.subsidiary})</span>
                          <span>OCR Confidence: {ver.ocrConfidence}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-[#E4E0D6] flex items-center justify-between">
              <button
                onClick={() => handleOpenUpload(true, activeDocForDetail)}
                className="px-4 py-2 bg-[#141C2B] text-white text-xs font-semibold rounded-lg hover:bg-[#1E293B] flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#C8892E]" />
                <span>Submit Version {activeDocForDetail.versions.length + 1}.0 Update</span>
              </button>
              <button
                onClick={() => setActiveDocForDetail(null)}
                className="px-4 py-2 bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg hover:bg-[#D4CEBF]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload / Controlled Update Modal Flow */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E4E0D6] overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-[#141C2B] text-white flex items-center justify-between border-b border-[#1E293B]">
              <div>
                <span className="text-[11px] font-mono text-[#C8892E] uppercase font-bold tracking-wider">
                  {isUpdateFlow ? 'Controlled Revision Submission' : 'Initial Document Ingestion'}
                </span>
                <h3 className="font-serif font-bold text-lg text-white mt-0.5">
                  {isUpdateFlow ? `Submit Revision to "${targetDocForUpdate?.title}"` : 'Upload New CMPDI Knowledge Record'}
                </h3>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-[#94A3B8] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 bg-[#F7F5F0] flex-1 text-xs">
              {/* Duplicate Detection Warning Banner (Section 5.4 Spec) */}
              {duplicateWarning && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-[#991B1B] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Duplicate Warning: </span>
                    <span>{duplicateWarning}</span>
                  </div>
                </div>
              )}

              {/* Title & Document Code */}
              {!isUpdateFlow && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#141C2B] mb-1">Document Title</label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Talcher Coalfield Seam VIII Hydrogeology"
                      className="w-full p-2.5 bg-white border border-[#E4E0D6] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#141C2B] mb-1">Document Code</label>
                    <input
                      type="text"
                      value={uploadDocCode}
                      onChange={(e) => setUploadDocCode(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#E4E0D6] rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Mandatory Reason For Change */}
              <div>
                <label className="block font-semibold text-[#141C2B] mb-1">
                  Reason for Change / Submission Context <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={uploadReason}
                  onChange={(e) => setUploadReason(e.target.value)}
                  placeholder={isUpdateFlow ? "Mandatory: Explain what borehole data, reserve figure, or safety guideline is being revised..." : "Provide technical summary of exploration or operational scope..."}
                  className="w-full p-2.5 bg-white border border-[#E4E0D6] rounded-lg text-xs"
                  required
                />
              </div>

              {/* Drag & Drop File Zone */}
              <div>
                <label className="block font-semibold text-[#141C2B] mb-1">Technical Document File (PDF / XLSX)</label>
                <div 
                  className="p-6 border-2 border-dashed border-[#C8892E]/60 bg-white rounded-lg text-center hover:bg-[#FAF8F3] transition-colors cursor-pointer"
                  onClick={() => handleFileDrop(
                    isUpdateFlow ? `${targetDocForUpdate?.title.split(' ')[0]}_Revision_v${(targetDocForUpdate?.versions.length || 1) + 1}.pdf` : 'CMPDI_Exploration_Data_2026.pdf',
                    'Comprehensive 14-borehole core survey confirms updated proved coal reserve of 56.2 MT (+4.8 MT upward adjustment) with Grade G7 ash content 31.4%.'
                  )}
                >
                  <FileUp className="w-8 h-8 text-[#C8892E] mx-auto mb-2" />
                  <p className="font-semibold text-[#141C2B]">Click to attach file or simulate drop</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">Supports scanned PDFs, tabular spreadsheets, and core log sheets</p>
                  {uploadFileName && (
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-[#FAF8F3] border border-[#E4E0D6] px-3 py-1 rounded text-xs font-mono font-bold text-[#141C2B]">
                      📄 {uploadFileName}
                    </div>
                  )}
                </div>
              </div>

              {/* OCR Progress Stepper (Visible 5 Steps: Uploaded -> OCR -> Table Extraction -> Cleaning -> Indexed) */}
              {isProcessingOcr && (
                <div className="bg-white p-4 rounded-lg border border-[#C8892E] shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[#141C2B]">
                    <span className="flex items-center gap-1.5 text-[#C8892E]">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Ingestion Pipeline In Progress...</span>
                    </span>
                    <span>Step {ocrStep} of 5</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-[#EFEBE2] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#C8892E] to-[#4C7A52] rounded-full transition-all duration-300"
                      style={{ width: `${(ocrStep / 5) * 100}%` }}
                    />
                  </div>

                  {/* Stepper Status Indicators */}
                  <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center">
                    <div className={ocrStep >= 1 ? 'text-[#16A34A] font-bold' : 'text-[#94A3B8]'}>
                      1. Uploaded
                    </div>
                    <div className={ocrStep >= 2 ? 'text-[#16A34A] font-bold' : 'text-[#94A3B8]'}>
                      2. OCR Parse
                    </div>
                    <div className={ocrStep >= 3 ? 'text-[#16A34A] font-bold' : 'text-[#94A3B8]'}>
                      3. Table Extract
                    </div>
                    <div className={ocrStep >= 4 ? 'text-[#16A34A] font-bold' : 'text-[#94A3B8]'}>
                      4. Cleaning
                    </div>
                    <div className={ocrStep >= 5 ? 'text-[#16A34A] font-bold' : 'text-[#94A3B8]'}>
                      5. Prepared
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-[#E4E0D6] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg hover:bg-[#D4CEBF]"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!uploadFileName || !uploadReason || isProcessingOcr}
                onClick={startOcrPipeline}
                className="px-5 py-2.5 bg-[#141C2B] hover:bg-[#1E293B] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-2"
              >
                <span>{isUpdateFlow ? 'Submit Revision to Approval Queue' : 'Ingest Document'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C8892E]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
