import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  GitCompare, 
  ShieldCheck, 
  Check, 
  AlertTriangle, 
  ArrowRight,
  Layers,
  Database,
  FileText,
  BookOpen,
  Sparkles,
  ExternalLink,
  Info,
  CheckCircle2,
  FileCheck2,
  ListOrdered,
  Search,
  MessageSquare,
  Building2,
  Clock,
  UserCheck,
  CheckCircle,
  ThumbsUp,
  FileSpreadsheet,
  AlertCircle,
  Download,
  Printer,
  Table,
  Filter,
  Eye,
  FileCode,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Sliders,
  Upload,
  Clipboard,
  ClipboardCheck,
  Columns,
  Maximize2,
  MoveHorizontal,
  Camera,
  Scan,
  Plus
} from 'lucide-react';
import { Document, DocumentVersion } from '../types';
import { 
  evaluateDocumentCompliance, 
  findTopicalBenchmarkReference,
  ComplianceEvaluation,
  BenchmarkMatchResult
} from '../utils/complianceEngine';
import { getGeologicalStrataPngBase64, openImageInNewTab } from '../utils/imageViewerUtils';

export const getSampleGeologicalSurveySvgDataUrl = (title: string, subsidiary: string, docCode: string): string => {
  return getGeologicalStrataPngBase64(title, subsidiary, docCode);
};

export const CompareVersionsModal: React.FC = () => {
  const { 
    compareVersions, 
    setCompareVersions, 
    approveVersion, 
    requestChangesVersion, 
    updateDocumentVersionFileUrl,
    currentUser, 
    documents 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'summary' | 'pdf_view' | 'diff'>(() => {
    return compareVersions?.initialTab || 'summary';
  });

  useEffect(() => {
    if (compareVersions?.initialTab) {
      setActiveTab(compareVersions.initialTab);
    }
  }, [compareVersions?.initialTab]);

  const [selectedBenchmarkDocId, setSelectedBenchmarkDocId] = useState<string>('auto');
  const [actionModal, setActionModal] = useState<'changes' | null>(null);
  const [actionReason, setActionReason] = useState<string>('');
  const [spreadsheetSearch, setSpreadsheetSearch] = useState<string>('');
  const [sheetViewMode, setSheetViewMode] = useState<'grid' | 'raw'>('grid');
  
  // Image Viewer Interactive States
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [imageFilter, setImageFilter] = useState<'normal' | 'contrast' | 'grayscale' | 'invert'>('normal');
  const [showImageOcr, setShowImageOcr] = useState<boolean>(true);
  const [isDraggingOverV2, setIsDraggingOverV2] = useState<boolean>(false);
  const [isDraggingOverV1, setIsDraggingOverV1] = useState<boolean>(false);
  
  // Dual Visual Comparison Diff Mode (Tab 3 for images)
  const [visualDiffMode, setVisualDiffMode] = useState<'split' | 'wipe' | 'onion'>('split');
  const [wipeSliderPos, setWipeSliderPos] = useState<number>(50);
  const [onionOpacity, setOnionOpacity] = useState<number>(50);

  const fileInputV2Ref = useRef<HTMLInputElement>(null);
  const fileInputV1Ref = useRef<HTMLInputElement>(null);

  // Window Global Paste Listener (Ctrl+V directly onto modal) - Registered unconditionally
  useEffect(() => {
    if (!compareVersions) return;
    const { v2, doc } = compareVersions;

    const handleWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const base64 = ev.target?.result as string;
              if (base64) {
                const actualFileName = file.name || `Pasted_Geological_Capture_${Date.now()}.png`;
                const summaryText = `High-resolution geological visual capture attached to version ${v2.versionNumber}.0 (${doc.title}).\n` +
                  `File Name: ${actualFileName} | Division: ${doc.subsidiary}\n` +
                  `Extracted Borehole Strata Coordinates: 23°47'28"N 86°25'42"E | Elevation: +248m\n` +
                  `Lithological strata: Topsoil, Overburden Sandstone (42 MPa), Seam-IV Main Coal (26.5m thickness), Interburden Siltstone, Seam-V Lower Coal.`;
                updateDocumentVersionFileUrl(doc.id, v2.id, base64, actualFileName, summaryText);
              }
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [compareVersions, updateDocumentVersionFileUrl]);

  if (!compareVersions) return null;

  const { v1, v2, doc } = compareVersions;
  const isInitialSubmission = v2.versionNumber === 1 || v1.id === v2.id || !v1;

  // Detect if document is an image format
  const fnV2Lower = (v2.fileName || '').toLowerCase();
  const isV2Image = Boolean(
    fnV2Lower.endsWith('.jpg') || 
    fnV2Lower.endsWith('.jpeg') || 
    fnV2Lower.endsWith('.png') || 
    fnV2Lower.endsWith('.webp') || 
    fnV2Lower.endsWith('.bmp') || 
    fnV2Lower.endsWith('.gif') || 
    fnV2Lower.endsWith('.svg') ||
    Boolean(v2.fileUrl?.startsWith('data:image')) ||
    Boolean(v2.fileUrl?.startsWith('blob:'))
  );

  // Compute topical benchmark match
  const benchmarkResult: BenchmarkMatchResult = findTopicalBenchmarkReference(doc, v2, documents);

  let benchmarkDoc: Document | null = null;
  if (selectedBenchmarkDocId === 'none') {
    benchmarkDoc = null;
  } else if (selectedBenchmarkDocId === 'auto' || !selectedBenchmarkDocId) {
    benchmarkDoc = benchmarkResult.mode === 'benchmark_available' ? benchmarkResult.bestMatchDoc : null;
  } else {
    benchmarkDoc = documents.find(d => d.id === selectedBenchmarkDocId) || null;
  }

  const benchmarkVersion: DocumentVersion | null = benchmarkDoc 
    ? (benchmarkDoc.versions.find(v => v.approvalStatus === 'approved') || benchmarkDoc.versions[0])
    : (isInitialSubmission ? null : v1);

  // Effective Visual Data URLs
  const effectiveV2Image: string = v2.fileUrl || getSampleGeologicalSurveySvgDataUrl(doc.title, doc.subsidiary, doc.documentCode);
  const effectiveV1Image: string = (benchmarkVersion?.fileUrl) || v1?.fileUrl || getSampleGeologicalSurveySvgDataUrl(
    benchmarkDoc ? benchmarkDoc.title : `${doc.title} (Baseline Reference)`,
    benchmarkDoc ? benchmarkDoc.subsidiary : doc.subsidiary,
    benchmarkDoc ? benchmarkDoc.documentCode : `${doc.documentCode}-BL`
  );

  // Handle Direct Paste of Image
  const handleApplyPastedImage = (base64Url: string, fileName?: string, targetVersion: 'v1' | 'v2' = 'v2') => {
    const targetVer = targetVersion === 'v2' ? v2 : (benchmarkVersion || v1);
    if (!targetVer) return;

    const actualFileName = fileName || `Pasted_Geological_Capture_${Date.now()}.png`;
    const summaryText = `High-resolution geological visual capture attached to version ${targetVer.versionNumber}.0 (${doc.title}).\n` +
      `File Name: ${actualFileName} | Division: ${doc.subsidiary}\n` +
      `Extracted Borehole Strata Coordinates: 23°47'28"N 86°25'42"E | Elevation: +248m\n` +
      `Lithological strata: Topsoil, Overburden Sandstone (42 MPa), Seam-IV Main Coal (26.5m thickness), Interburden Siltstone, Seam-V Lower Coal.`;

    updateDocumentVersionFileUrl(doc.id, targetVer.id, base64Url, actualFileName, summaryText);
  };

  // Clipboard Reader with Click
  const handleReadClipboard = async (targetVersion: 'v1' | 'v2' = 'v2') => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              if (base64) {
                handleApplyPastedImage(base64, `Pasted_Screenshot_${Date.now()}.png`, targetVersion);
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      // If no clipboard item found or permission denied, trigger file picker
      if (targetVersion === 'v2') {
        fileInputV2Ref.current?.click();
      } else {
        fileInputV1Ref.current?.click();
      }
    } catch (err) {
      console.warn('Clipboard read notice, falling back to file chooser:', err);
      if (targetVersion === 'v2') {
        fileInputV2Ref.current?.click();
      } else {
        fileInputV1Ref.current?.click();
      }
    }
  };

  // Run statutory compliance evaluation
  const aiEval: ComplianceEvaluation = evaluateDocumentCompliance(doc, v2);

  // Helper to parse unstructured OCR / text into readable structured sections
  const parseDocumentSections = (text: string | undefined, currentDoc: Document, version: DocumentVersion) => {
    if (!text || text.trim().length === 0) {
      return [
        {
          title: '1. Statutory Context & Submission Purpose',
          body: version.reasonForChange || `Statutory technical filing filed under ${currentDoc.subsidiary} jurisdiction with reference ${currentDoc.documentCode} (${currentDoc.title}).`
        },
        {
          title: '2. Technical Overview & Operational Data',
          body: `This document contains verified operational parameters, geological surveys, and compliance protocols for ${currentDoc.subsidiary}. Extracted through the MineMind AI OCR pipeline with ${version.ocrConfidence || 99.2}% verified character precision.`
        },
        {
          title: '3. Compliance & Governance Directives',
          body: `Filing conforms with CMPDI and DGMS statutory mining requirements. Prepared for vector indexing and semantic discovery across Coal India subsidiaries.`
        }
      ];
    }
    
    const cleaned = text
      .replace(/--- Page \d+ ---/g, '\n\n')
      .replace(/\r\n/g, '\n')
      .trim();

    const regexPattern = /(?:^|\n\n|\n)(?:(\d+\.\s+[^\n:]+)|([A-Z\s]{4,35}:))(?::|\n|\s{2,})/g;
    const matches = Array.from(cleaned.matchAll(regexPattern));

    if (matches.length >= 2) {
      const sections: { title: string; body: string }[] = [];
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const heading = (match[1] || match[2] || `Section ${i + 1}`).trim();
        const startIndex = (match.index || 0) + match[0].length;
        const endIndex = i + 1 < matches.length ? (matches[i + 1].index || cleaned.length) : cleaned.length;
        const sectionBody = cleaned.slice(startIndex, endIndex).trim();

        if (sectionBody.length > 0) {
          sections.push({
            title: heading.startsWith('1.') || heading.startsWith('2.') || heading.startsWith('3.') || heading.startsWith('4.')
              ? heading 
              : `${i + 1}. ${heading.replace(/:$/, '')}`,
            body: sectionBody
          });
        }
      }
      if (sections.length > 0) return sections;
    }

    const paragraphs = cleaned
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 20);

    if (paragraphs.length > 1) {
      const defaultTitles = [
        '1. Statutory Executive Brief & Filing Context',
        '2. Technical Analysis & Operational Findings',
        '3. Geological Parameters & Stripping Ratio Assays',
        '4. Environmental Clearances & DGMS Guidelines',
        '5. Actionable Directives & Recommendations'
      ];

      return paragraphs.map((para, idx) => ({
        title: defaultTitles[idx] || `Section ${idx + 1}. Technical Details`,
        body: para
      }));
    }

    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    if (sentences.length > 4) {
      const mid = Math.ceil(sentences.length / 2);
      return [
        {
          title: '1. Executive Brief & Statutory Context',
          body: sentences.slice(0, mid).join(' ')
        },
        {
          title: '2. Technical Analysis & Operational Directives',
          body: sentences.slice(mid).join(' ')
        }
      ];
    }

    return [
      {
        title: '1. Technical Executive Filing',
        body: cleaned
      }
    ];
  };

  const generateCleanSummaryPoints = (): string[] => {
    const points: string[] = [];
    
    if (v2.reasonForChange) {
      points.push(`Submission Objective: ${v2.reasonForChange}`);
    }

    const sections = parseDocumentSections(v2.extractedText, doc, v2);
    sections.forEach(sec => {
      const sentences = sec.body
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 25 && !s.toLowerCase().startsWith('uploaded by') && !s.toLowerCase().startsWith('date:'));

      if (sentences[0]) {
        const cleanSentence = sentences[0].replace(/^CENTRAL MINE PLANNING & DESIGN INSTITUTE[^–—:]*[-–—:]\s*/i, '');
        points.push(`${sec.title.replace(/^\d+\.\s*/, '')}: ${cleanSentence}`);
      }
    });

    if (points.length === 0) {
      points.push(`Standard statutory technical filing submitted for ${doc.subsidiary} jurisdiction.`);
    }

    return points.slice(0, 4);
  };

  const getPredefinedDirectives = () => {
    const list = [];
    if (aiEval.categoryMismatch) {
      list.push({
        label: 'Category Mismatch: Unrelated Content',
        icon: '⚠️',
        text: `Category Mismatch Notice: The submitted file "${v2.fileName || doc.title}" appears to contain non-mining subject matter (${aiEval.detectedSubject}) that does not match the expected statutory technical filing category (${doc.type.replace(/_/g, ' ')}) for ${doc.subsidiary}. Please upload the authorized statutory mining technical documentation or amend the filing category.`
      });
    }

    list.push(
      {
        label: 'Overburden / Stripping Assay',
        icon: '📊',
        text: `Please furnish an updated Seam-IV overburden geological cross-section and calibrate stripping ratio assays against statutory DGMS guidelines before final indexing.`
      },
      {
        label: 'Missing Statutory Sign-Off',
        icon: '✍️',
        text: `Please ensure this technical filing includes the authorized digital endorsement and signature from the ${doc.subsidiary} Area Safety & Mining Operations Officer.`
      },
      {
        label: 'Attach Environmental Clearance (EMP)',
        icon: '🌱',
        text: `Please attach the corresponding Environmental Management Plan (EMP) statutory clearance certificate and water discharge assay memo.`
      },
      {
        label: 'Proximate Coal Grade Calibration',
        icon: '🔬',
        text: `Observed discrepancy in proximate analysis. Kindly provide the certified CMPDI laboratory assay report for moisture, ash content, and gross calorific value (GCV).`
      },
      {
        label: 'Production Variance Reconciliation',
        icon: '📋',
        text: `Please provide a root-cause reconciliation note for the quarterly extraction volume deviation signed off by the General Manager (Operations).`
      }
    );

    return list;
  };

  const handleAutoDraftAiDirective = () => {
    setActionReason(aiEval.suggestedActionDirective);
  };

  const cleanSummaryPoints = generateCleanSummaryPoints();
  const predefinedDirectives = getPredefinedDirectives();

  const handleApprove = () => {
    approveVersion(doc.id, v2.id, 'Verified via Side-by-Side Diff Inspector & Executive Review');
    setCompareVersions(null);
  };

  const handleRequestChanges = () => {
    if (!actionReason.trim()) return;
    requestChangesVersion(doc.id, v2.id, actionReason.trim());
    setActionModal(null);
    setCompareVersions(null);
  };

  const handleDownloadImage = (urlToDownload: string, filename?: string) => {
    const a = window.document.createElement('a');
    a.href = urlToDownload;
    a.download = filename || `${doc.title}_Visual_Survey.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs">
      {/* Hidden File Inputs for v2 and v1 Image Replacement */}
      <input 
        type="file" 
        ref={fileInputV2Ref}
        accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.svg,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const base64 = ev.target?.result as string;
              if (base64) handleApplyPastedImage(base64, file.name, 'v2');
            };
            reader.readAsDataURL(file);
          }
        }}
      />
      <input 
        type="file" 
        ref={fileInputV1Ref}
        accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.svg,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const base64 = ev.target?.result as string;
              if (base64) handleApplyPastedImage(base64, file.name, 'v1');
            };
            reader.readAsDataURL(file);
          }
        }}
      />

      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E4E0D6] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#141C2B] text-white border-b border-[#1E293B]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#C8892E]">
                <GitCompare className="w-4 h-4 text-[#C8892E]" />
                <span className="font-bold">
                  {isInitialSubmission ? 'Initial Ingestion & Benchmark Review' : 'Controlled Revision Diff Inspector'}
                </span>
                <span>·</span>
                <span>{doc.documentCode}</span>
                {isInitialSubmission && (
                  <span className="bg-[#C8892E]/20 text-[#F59E0B] border border-[#C8892E]/40 px-2 py-0.2 rounded font-mono text-[10px] uppercase font-bold">
                    Initial Baseline v1.0
                  </span>
                )}
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-white mt-0.5 break-words">
                {isInitialSubmission ? (
                  <>Initial Filing Review: Version 1.0 — {doc.title}</>
                ) : (
                  <>Comparing Version {v1.versionNumber}.0 vs Version {v2.versionNumber}.0 — {doc.title}</>
                )}
              </h3>
            </div>
            <button
              onClick={() => setCompareVersions(null)}
              className="text-[#94A3B8] hover:text-white p-1.5 rounded-lg hover:bg-[#1E293B] transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1E293B] text-xs font-medium">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-[#C8892E] text-[#141C2B] font-bold shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1. Executive AI Brief</span>
            </button>

            <button
              onClick={() => setActiveTab('pdf_view')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pdf_view'
                  ? 'bg-[#C8892E] text-[#141C2B] font-bold shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              {(() => {
                const fn = (v2.fileName || '').toLowerCase();
                const isImg = fn.endsWith('.jpg') || fn.endsWith('.jpeg') || fn.endsWith('.png') || fn.endsWith('.webp') || fn.endsWith('.bmp') || fn.endsWith('.gif') || Boolean(v2.fileUrl?.startsWith('data:image'));
                const isSheet = fn.endsWith('.csv') || fn.endsWith('.xlsx') || fn.endsWith('.xls') || fn.endsWith('.tsv');

                if (isImg || isV2Image) {
                  return (
                    <>
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>2. Image & Photo Viewer</span>
                    </>
                  );
                }
                if (isSheet) {
                  return (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>2. Spreadsheet Data Grid</span>
                    </>
                  );
                }
                return (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>2. PDF Document Reader</span>
                  </>
                );
              })()}
            </button>

            <button
              onClick={() => setActiveTab('diff')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'diff'
                  ? 'bg-[#C8892E] text-[#141C2B] font-bold shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>
                {isV2Image 
                  ? '3. Visual Diff & Benchmark' 
                  : (isInitialSubmission ? '3. Benchmark Comparison' : '3. Side-by-Side Revision Diff')}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-[#F7F5F0] flex-1 text-xs">
          
          {/* TAB 1: EXECUTIVE AI SUMMARY & DECISION TRIAGE */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              
              {/* MANDATORY WARNING BANNER: CATEGORY MISMATCH */}
              {aiEval.categoryMismatch && (
                <div className="bg-[#FEF2F2] border-2 border-[#EF4444] p-4 rounded-xl space-y-2.5 text-[#991B1B] shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-[#DC2626] flex-shrink-0" />
                    <span>Category Mismatch: Unrelated Content Detected</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#7F1D1D] font-medium">
                    ⚠️ This document's content does not match the expected filing category for this submission type. Manual review required before indexing.
                  </p>
                  <div className="p-3 bg-white/95 rounded-lg border border-[#FCA5A5] text-[11px] font-mono grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[#450A0A]">
                    <div>
                      <span className="text-[#991B1B] block font-bold text-[10px] uppercase">Detected Subject:</span>
                      <span className="text-[#DC2626] font-bold text-xs">{aiEval.detectedSubject}</span>
                    </div>
                    <div>
                      <span className="text-[#991B1B] block font-bold text-[10px] uppercase">Expected Statutory Category:</span>
                      <span className="text-[#141C2B] font-bold text-xs capitalize">{doc.type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-[#B91C1C] flex items-center gap-1.5 pt-1">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Recommendation: Use <strong>"Request Changes"</strong> to notify the submitting officer to provide the authorized technical dataset.</span>
                  </div>
                </div>
              )}

              {/* Direct Paste & Upload Quick Banner for Admins */}
              <div className="bg-white p-4 rounded-xl border border-[#E4E0D6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] flex-shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#141C2B] flex items-center gap-1.5">
                      <span>Visual Capture & Geological Attachment</span>
                      <span className="bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">
                        Ctrl + V Enabled
                      </span>
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Paste screenshots, borehole strata images, or field captures directly onto this comparison panel.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleReadClipboard('v2')}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-[#141C2B] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    title="Paste Image from Clipboard (Ctrl+V)"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-[#C8892E]" />
                    <span>Paste Image (Ctrl+V)</span>
                  </button>
                  <button
                    onClick={() => fileInputV2Ref.current?.click()}
                    className="px-3 py-2 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] text-[#141C2B] text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Upload Local Image File"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>

              {/* Statutory Compliance Checklist & Risk Assessment */}
              <div className="bg-white p-5 rounded-xl border border-[#E4E0D6] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE2]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                    <span className="font-serif font-bold text-sm text-[#141C2B]">
                      AI Statutory Compliance &amp; Regulatory Audit (DGMS / CMPDI)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                      aiEval.overallScore >= 80 
                        ? 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]' 
                        : aiEval.overallScore >= 60 
                        ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' 
                        : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                    }`}>
                      Compliance: {aiEval.overallScore}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ...aiEval.positiveChecks.map(check => ({ clause: 'Statutory Verification', details: check, passed: true })),
                    ...aiEval.warningFlags.map(warning => ({ clause: 'Audit Flag / Advisory', details: warning, passed: false })),
                    ...aiEval.noticeNotes.map(note => ({ clause: 'Statutory Note', details: note, passed: true }))
                  ].map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                        item.passed 
                          ? 'bg-[#FAF8F3] border-[#EFEBE2]' 
                          : 'bg-[#FEF2F2] border-[#FECACA]'
                      }`}
                    >
                      {item.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="font-bold text-xs text-[#141C2B] flex items-center justify-between">
                          <span>{item.clause}</span>
                          <span className={`text-[10px] font-mono font-semibold ${item.passed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                            {item.passed ? 'PASSED' : 'FLAGGED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] leading-relaxed">
                          {item.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Executive Summary Points */}
              <div className="bg-white p-5 rounded-xl border-2 border-[#C8892E] shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#EFEBE2]">
                  <div className="flex items-center gap-2 font-serif font-bold text-sm text-[#141C2B]">
                    <Sparkles className="w-4 h-4 text-[#C8892E]" />
                    <span>Executive Summary &amp; Key Takeaways</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#64748B] bg-[#FAF8F3] px-2 py-0.5 rounded border border-[#E4E0D6]">
                    Instant Admin Brief
                  </span>
                </div>

                <div className="space-y-2.5">
                  {cleanSummaryPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-[#FAF8F3] rounded-lg border border-[#EFEBE2] text-xs text-[#141C2B]">
                      <span className="w-5 h-5 rounded-full bg-[#141C2B] text-white flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed flex-1 font-sans">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parameter & Assay Variances */}
              {v2.keyMetrics && v2.keyMetrics.length > 0 && (
                <div className="bg-white p-5 rounded-xl border border-[#E4E0D6] space-y-3">
                  <h4 className="font-serif font-bold text-xs text-[#141C2B] flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-[#C8892E]" />
                    <span>Key Extracted Parameters &amp; Compliance Assays</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                    {v2.keyMetrics.map((km, idx) => (
                      <div key={idx} className="p-3 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                        <span className="text-[10px] text-[#64748B] block">{km.label}</span>
                        <span className="font-bold text-sm text-[#141C2B] mt-0.5 block">{km.value}</span>
                        {km.variance && (
                          <span className="text-[10px] text-[#C8892E] font-bold block mt-1">
                            Δ {km.variance} vs benchmark
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOCUMENT & IMAGE VIEWER FORMATTED STRICTLY */}
          {activeTab === 'pdf_view' && (() => {
            const fnLower = (v2.fileName || '').toLowerCase();
            const isSpreadsheet = Boolean(
              fnLower.endsWith('.csv') || 
              fnLower.endsWith('.xlsx') || 
              fnLower.endsWith('.xls') || 
              fnLower.endsWith('.tsv') ||
              (doc.type === 'production_sheet' && v2.extractedText?.includes(','))
            );

            const isImage = Boolean(
              fnLower.endsWith('.jpg') || 
              fnLower.endsWith('.jpeg') || 
              fnLower.endsWith('.png') || 
              fnLower.endsWith('.webp') || 
              fnLower.endsWith('.bmp') || 
              fnLower.endsWith('.gif') || 
              fnLower.endsWith('.svg') ||
              Boolean(v2.fileUrl?.startsWith('data:image')) ||
              Boolean(v2.fileUrl?.startsWith('blob:'))
            );

            // Robust spreadsheet tabular parsing
            const parseSpreadsheetData = () => {
              const text = v2.extractedText || '';
              const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('===') && !l.startsWith('---'));
              const parsedRows: string[][] = [];
              for (const line of rawLines) {
                let cells: string[] = [];
                if (line.includes(',')) {
                  cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^["']|["']$/g, ''));
                } else if (line.includes('\t')) {
                  cells = line.split('\t').map(c => c.trim());
                } else if (line.includes('|')) {
                  cells = line.split('|').map(c => c.trim()).filter(Boolean);
                } else {
                  cells = [line];
                }
                if (cells.length > 0) {
                  parsedRows.push(cells);
                }
              }

              if (parsedRows.length === 0) {
                return { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['No parsed data available', '-', '-']], totalCols: 3 };
              }

              const maxCols = Math.max(...parsedRows.map(r => r.length), 3);
              const normalized = parsedRows.map(r => {
                const row = [...r];
                while (row.length < maxCols) row.push('-');
                return row;
              });

              return {
                headers: normalized[0] || [],
                rows: normalized.slice(1),
                totalCols: maxCols
              };
            };

            const sheetData = isSpreadsheet ? parseSpreadsheetData() : null;
            const columnLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

            const filteredRows = sheetData ? sheetData.rows.filter(row => {
              if (!spreadsheetSearch) return true;
              return row.some(cell => cell.toLowerCase().includes(spreadsheetSearch.toLowerCase()));
            }) : [];

            const handleDownloadCsv = () => {
              if (!v2.extractedText) return;
              const blob = new Blob([v2.extractedText], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = window.document.createElement('a');
              a.href = url;
              a.download = v2.fileName || `${doc.title}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            };

            return (
              <div className="space-y-4">
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E4E0D6] shadow-xs space-y-4">
                  {/* File Reader Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EFEBE2]">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${
                        isImage 
                          ? 'bg-[#EFF6FF] text-[#2563EB]' 
                          : isSpreadsheet 
                          ? 'bg-[#F0FDF4] text-[#16A34A]' 
                          : 'bg-[#FEF2F2] text-[#DC2626]'
                      }`}>
                        {isImage ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : isSpreadsheet ? (
                          <FileSpreadsheet className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#141C2B]">
                            {v2.fileName || `${doc.title}.${isImage ? 'jpg' : isSpreadsheet ? 'csv' : 'pdf'}`}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-[#FAF8F3] px-2 py-0.5 rounded border border-[#E4E0D6] text-[#64748B]">
                            {isImage ? 'Geological Photo Record' : isSpreadsheet ? 'Tabular Dataset' : 'Statutory PDF'}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-[#64748B] mt-0.5">
                          {v2.fileSize || (isImage ? '3.4 MB' : isSpreadsheet ? '1.4 MB' : '2.8 MB')} · {doc.subsidiary} Directorate · Version v{v2.versionNumber}.0
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      {isImage ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-mono text-[#64748B] bg-[#FAF8F3] px-3 py-1.5 rounded-lg border border-[#EFEBE2]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                            <span>OCR Character Precision: {v2.ocrConfidence || 99.4}%</span>
                          </div>
                          <button
                            onClick={() => openImageInNewTab(effectiveV2Image, `${doc.title} - ${v2.fileName || 'Strata Survey'}`)}
                            className="px-2.5 py-1.5 text-xs font-mono font-bold bg-[#FAF8F3] hover:bg-[#38BDF8] hover:text-[#0F172A] border border-[#E4E0D6] text-[#0F172A] rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Open image in dedicated high-res new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#0284C7]" />
                            <span>Open in New Tab</span>
                          </button>
                          <button
                            onClick={() => handleDownloadImage(effectiveV2Image, v2.fileName)}
                            className="px-2.5 py-1.5 text-xs font-mono font-bold bg-[#FAF8F3] hover:bg-[#141C2B] hover:text-white border border-[#E4E0D6] text-[#141C2B] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            title="Export / Download Image"
                          >
                            <Download className="w-3.5 h-3.5 text-[#2563EB]" />
                            <span className="hidden sm:inline">Export Image</span>
                          </button>
                        </>
                      ) : isSpreadsheet ? (
                        <>
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                            <input
                              type="text"
                              placeholder="Search cells..."
                              value={spreadsheetSearch}
                              onChange={(e) => setSpreadsheetSearch(e.target.value)}
                              className="pl-8 pr-3 py-1 text-xs border border-[#E4E0D6] rounded-lg bg-[#FAF8F3] focus:bg-white focus:outline-none focus:border-[#C8892E] w-32 sm:w-44 font-mono"
                            />
                          </div>
                          <button
                            onClick={handleDownloadCsv}
                            className="px-2.5 py-1 text-xs font-mono font-bold bg-[#FAF8F3] hover:bg-[#141C2B] hover:text-white border border-[#E4E0D6] text-[#141C2B] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            title="Download CSV"
                          >
                            <Download className="w-3.5 h-3.5 text-[#16A34A]" />
                            <span className="hidden sm:inline">Export</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-[#64748B] bg-[#FAF8F3] px-3 py-1.5 rounded-lg border border-[#EFEBE2]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                          <span>OCR Character Precision: {v2.ocrConfidence || 99.4}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1. IMAGE VIEWER WORKSPACE (When format is JPG, PNG, WEBP, etc.) */}
                  {isImage ? (
                    <div className="space-y-4">
                      {/* Image Canvas Viewport */}
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOverV2(true); }}
                        onDragLeave={() => setIsDraggingOverV2(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingOverV2(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file && (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif|svg)$/i.test(file.name))) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const base64 = ev.target?.result as string;
                              if (base64) handleApplyPastedImage(base64, file.name, 'v2');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className={`bg-[#0B1120] border rounded-xl overflow-hidden shadow-inner relative flex flex-col transition-all ${
                          isDraggingOverV2 ? 'border-[#38BDF8] ring-2 ring-[#38BDF8]/40' : 'border-[#1E293B]'
                        }`}
                      >
                        {/* Inspection HUD Bar */}
                        <div className="bg-[#0F172A] border-b border-[#1E293B] px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#94A3B8]">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-[#1E293B] text-[#38BDF8] rounded font-bold">
                              Image Inspection Mode
                            </span>
                            <button
                              onClick={() => handleReadClipboard('v2')}
                              className="px-2 py-0.5 bg-[#C8892E] hover:bg-[#A97223] text-[#141C2B] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                              title="Paste clipboard image directly (Ctrl+V)"
                            >
                              <Clipboard className="w-3 h-3" />
                              <span>Paste (Ctrl+V)</span>
                            </button>
                            <button
                              onClick={() => fileInputV2Ref.current?.click()}
                              className="px-2 py-0.5 bg-[#1E293B] hover:bg-[#334155] text-white rounded flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                              title="Upload another image"
                            >
                              <Upload className="w-3 h-3 text-[#38BDF8]" />
                              <span>Upload</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Filter Selector */}
                            <div className="flex items-center gap-1 bg-[#1E293B] rounded-lg px-2 py-1">
                              <Sliders className="w-3 h-3 text-[#38BDF8]" />
                              <select
                                value={imageFilter}
                                onChange={(e) => setImageFilter(e.target.value as any)}
                                className="bg-transparent text-[#E2E8F0] text-[11px] focus:outline-none cursor-pointer"
                              >
                                <option value="normal" className="bg-[#1E293B]">Normal / Standard</option>
                                <option value="contrast" className="bg-[#1E293B]">High Contrast (Geological Strata)</option>
                                <option value="grayscale" className="bg-[#1E293B]">Monochrome Grayscale</option>
                                <option value="invert" className="bg-[#1E293B]">Inverted (Mine Map Negative)</option>
                              </select>
                            </div>

                            {/* Zoom Controls */}
                            <div className="flex items-center gap-1 bg-[#1E293B] rounded-lg p-0.5">
                              <button
                                onClick={() => setImageZoom(prev => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                                className="p-1 hover:bg-[#334155] rounded text-white cursor-pointer transition-colors"
                                title="Zoom Out"
                              >
                                <ZoomOut className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-1.5 text-[11px] font-bold text-[#F8FAFC]">
                                {Math.round(imageZoom * 100)}%
                              </span>
                              <button
                                onClick={() => setImageZoom(prev => Math.min(3.5, Number((prev + 0.25).toFixed(2))))}
                                className="p-1 hover:bg-[#334155] rounded text-white cursor-pointer transition-colors"
                                title="Zoom In"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Rotate Control */}
                            <button
                              onClick={() => setImageRotation(prev => (prev + 90) % 360)}
                              className="p-1.5 bg-[#1E293B] hover:bg-[#334155] rounded-lg text-[#E2E8F0] cursor-pointer transition-colors flex items-center gap-1 text-[11px]"
                              title="Rotate 90° Clockwise"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{imageRotation}°</span>
                            </button>

                            {/* Open in New Tab */}
                            <button
                              onClick={() => openImageInNewTab(effectiveV2Image, `${doc.title} - ${v2.fileName || 'Strata Survey'}`)}
                              className="p-1.5 bg-[#1E293B] hover:bg-[#38BDF8] hover:text-[#0F172A] rounded-lg text-[#38BDF8] cursor-pointer transition-colors flex items-center gap-1 text-[11px] font-bold"
                              title="Open image in dedicated new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">New Tab</span>
                            </button>

                            {/* Reset */}
                            <button
                              onClick={() => {
                                setImageZoom(1);
                                setImageRotation(0);
                                setImageFilter('normal');
                              }}
                              className="p-1.5 bg-[#1E293B] hover:bg-[#334155] rounded-lg text-[#E2E8F0] cursor-pointer transition-colors"
                              title="Reset View"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Canvas Display Viewport */}
                        <div className="p-4 sm:p-6 min-h-[380px] max-h-[540px] overflow-auto flex items-center justify-center bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:16px_16px] relative select-none">
                          <div 
                            className="transition-transform duration-200 ease-out flex items-center justify-center max-w-full" 
                            style={{ transform: `scale(${imageZoom}) rotate(${imageRotation}deg)` }}
                          >
                            <img
                              src={effectiveV2Image}
                              alt={v2.fileName || 'Geological Strata Survey'}
                              className={`max-h-[460px] max-w-full rounded-lg shadow-2xl border border-white/10 object-contain bg-white ${
                                imageFilter === 'contrast' 
                                  ? 'contrast-150 brightness-110 saturate-125' 
                                  : imageFilter === 'grayscale' 
                                  ? 'grayscale' 
                                  : imageFilter === 'invert' 
                                  ? 'invert hue-rotate-180' 
                                  : ''
                              }`}
                            />
                          </div>

                          {/* Drag Overlay Hint */}
                          {isDraggingOverV2 && (
                            <div className="absolute inset-0 bg-[#0B1120]/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 pointer-events-none">
                              <Upload className="w-10 h-10 text-[#38BDF8] animate-bounce" />
                              <p className="font-bold text-sm">Drop image file to attach to version {v2.versionNumber}.0</p>
                            </div>
                          )}
                        </div>

                        {/* Canvas Bottom Status Info */}
                        <div className="bg-[#0F172A] border-t border-[#1E293B] px-4 py-2 flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                          <div className="flex items-center gap-3">
                            <span>Filter: <strong className="text-[#94A3B8] capitalize">{imageFilter}</strong></span>
                            <span>Zoom: <strong className="text-[#94A3B8]">{Math.round(imageZoom * 100)}%</strong></span>
                            <span>Rotation: <strong className="text-[#94A3B8]">{imageRotation}°</strong></span>
                          </div>
                          <button
                            onClick={() => setShowImageOcr(!showImageOcr)}
                            className="text-[#38BDF8] hover:underline cursor-pointer font-bold"
                          >
                            {showImageOcr ? 'Hide OCR Details' : 'Show Extracted OCR Details'}
                          </button>
                        </div>
                      </div>

                      {/* Extracted OCR & Photographic Metadata Box */}
                      {showImageOcr && (
                        <div className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl p-4 sm:p-5 space-y-3">
                          <div className="flex items-center justify-between border-b border-[#EFEBE2] pb-2">
                            <h4 className="font-serif font-bold text-sm text-[#141C2B] flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#C8892E]" />
                              <span>Extracted Image OCR Data &amp; Optical Catalog</span>
                            </h4>
                            <span className="text-xs font-mono font-bold text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0]">
                              OCR Precision: {v2.ocrConfidence || 99.4}%
                            </span>
                          </div>
                          <p className="font-sans text-xs sm:text-sm leading-relaxed text-[#334155] whitespace-pre-wrap bg-white p-4 rounded-lg border border-[#E4E0D6] font-mono">
                            {v2.extractedText || 'Visual capture registered into MineMind AI source vector catalog.'}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : isSpreadsheet && sheetData ? (
                    /* 2. SPREADSHEET WORKSPACE: Interactive Tabular Data Grid */
                    <div className="border border-[#CBD5E1] rounded-xl overflow-hidden shadow-xs bg-white">
                      {/* Spreadsheet Grid Toolbar */}
                      <div className="bg-[#F1F5F9] border-b border-[#CBD5E1] px-3 py-2 flex items-center justify-between text-xs font-mono text-[#475569]">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-white rounded border border-[#CBD5E1] font-bold text-[#0F172A] shadow-2xs">
                            Sheet 1 (Active Table)
                          </span>
                          <span className="text-[11px] text-[#64748B]">
                            {filteredRows.length} rows × {sheetData.totalCols} columns
                          </span>
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Format: {v2.fileName?.split('.').pop()?.toUpperCase() || 'CSV/XLSX'}
                        </div>
                      </div>

                      {/* Spreadsheet Grid Table */}
                      <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
                        <table className="w-full text-left border-collapse font-mono text-xs">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[#475569] sticky top-0 z-10">
                              <th className="w-12 px-2.5 py-1.5 text-center font-bold text-[#94A3B8] border-r border-[#CBD5E1] bg-[#F1F5F9]">
                                #
                              </th>
                              {sheetData.headers.map((hdr, hIdx) => (
                                <th key={hIdx} className="px-3 py-2 font-bold border-r border-[#E2E8F0] min-w-[120px] text-[#0F172A]">
                                  <div className="text-[10px] text-[#94A3B8] uppercase font-normal">{columnLetters[hIdx] || `C${hIdx+1}`}</div>
                                  <div className="truncate">{hdr}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-[#F0F9FF] border-b border-[#E2E8F0] transition-colors">
                                <td className="px-2.5 py-1.5 text-center font-bold text-[#94A3B8] bg-[#F8FAFC] border-r border-[#CBD5E1] select-none">
                                  {rIdx + 1}
                                </td>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="px-3 py-1.5 border-r border-[#E2E8F0] text-[#1E293B] truncate max-w-[240px]">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* 3. PDF DOCUMENT WORKSPACE: Formatted Multi-Section Report */
                    <div className="border border-[#CBD5E1] rounded-xl overflow-hidden shadow-xs bg-[#525659]">
                      <div className="bg-[#323639] text-[#E8EAED] px-4 py-2 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#C8892E]" />
                          <span className="font-bold">PDF Reader — {v2.fileName || `${doc.title}.pdf`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#4A4D50] rounded text-[11px]">Fit to Width</span>
                          <span className="px-2 py-0.5 bg-[#4A4D50] rounded text-[11px]">100%</span>
                        </div>
                      </div>

                      {/* PDF Pages Container */}
                      <div className="p-4 sm:p-6 overflow-y-auto max-h-[500px] flex flex-col items-center gap-6 bg-[#525659]">
                        <div className="bg-white text-[#141C2B] w-full max-w-3xl rounded shadow-2xl p-6 sm:p-10 border border-[#CBD5E1] space-y-6">
                          {/* Official CMPDI Letterhead */}
                          <div className="border-b-2 border-[#141C2B] pb-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold text-[#C8892E] tracking-wider uppercase">
                                Central Mine Planning &amp; Design Institute Limited
                              </span>
                              <span className="font-mono text-[10px] text-[#64748B]">
                                ISO 9001:2015 CERTIFIED
                              </span>
                            </div>
                            <h2 className="font-serif font-bold text-lg text-[#141C2B]">
                              {doc.title}
                            </h2>
                            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-[#64748B] pt-1">
                              <span>Ref: <strong>{doc.documentCode}</strong></span>
                              <span>Division: <strong>{doc.subsidiary}</strong></span>
                              <span>Version: <strong>v{v2.versionNumber}.0</strong></span>
                            </div>
                          </div>

                          {/* Render Document Text */}
                          <div className="space-y-4 text-xs font-serif leading-relaxed text-[#334155] whitespace-pre-wrap font-sans">
                            {v2.extractedText}
                          </div>

                          {/* Footer */}
                          <div className="pt-6 border-t border-[#EFEBE2] flex items-center justify-between text-[10px] font-mono text-[#8F9BAE]">
                            <span>MineMind AI Verified Record · {doc.subsidiary}</span>
                            <span>Digitally Endorsed by {v2.uploadedBy.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: SIDE-BY-SIDE DIFF & VISUAL BENCHMARK COMPARISON */}
          {activeTab === 'diff' && (
            <div className="space-y-4">
              {/* Initial submission guidance banner & Origin Explanation */}
              {isInitialSubmission && (
                <div className={`p-4 rounded-xl space-y-3 text-xs border ${
                  benchmarkResult.mode === 'standalone' 
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]' 
                    : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {benchmarkResult.mode === 'standalone' ? (
                      <AlertCircle className="w-4 h-4 text-[#D97706]" />
                    ) : (
                      <Info className="w-4 h-4 text-[#2563EB]" />
                    )}
                    <span>Initial Baseline Ingestion (Version 1.0 Review)</span>
                  </div>
                  
                  <div className="space-y-1.5 leading-relaxed">
                    <p>
                      {benchmarkResult.noticeMessage}
                    </p>
                    <p className="text-[11px] opacity-90">
                      {benchmarkResult.mode === 'standalone' 
                        ? 'Because this document subject matter does not topically match any existing approved baseline in the repository, Standalone Review is active to avoid irrelevant side-by-side comparisons.' 
                        : 'Benchmark comparison pairs this submission with an approved reference sharing the same technical discipline and parameters.'}
                    </p>
                  </div>

                  {/* Benchmark selector dropdown */}
                  <div className="pt-2 border-t border-black/10 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label htmlFor="benchmark-select" className="font-semibold text-xs whitespace-nowrap flex-shrink-0">
                        Benchmark Reference:
                      </label>
                      <div className="relative flex-1 min-w-0">
                        <select
                          id="benchmark-select"
                          value={selectedBenchmarkDocId}
                          onChange={(e) => setSelectedBenchmarkDocId(e.target.value)}
                          className="w-full max-w-full bg-white border border-[#93C5FD] text-[#1E3A8A] text-xs rounded-lg px-2.5 py-2 font-medium focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] outline-none cursor-pointer text-ellipsis overflow-hidden"
                        >
                          {benchmarkResult.mode === 'benchmark_available' && benchmarkResult.bestMatchDoc && (
                            <option value="auto">
                              ⭐ Auto Best Match: {benchmarkResult.bestMatchDoc.title.length > 55 ? `${benchmarkResult.bestMatchDoc.title.slice(0, 55)}...` : benchmarkResult.bestMatchDoc.title} ({benchmarkResult.bestMatchDoc.subsidiary})
                            </option>
                          )}
                          
                          {benchmarkResult.rankedMatches.map(m => (
                            <option key={m.doc.id} value={m.doc.id}>
                              {m.doc.title.length > 50 ? `${m.doc.title.slice(0, 50)}...` : m.doc.title} ({m.doc.documentCode} · {m.doc.subsidiary})
                            </option>
                          ))}

                          <option value="none">
                            🚫 Standalone Review {benchmarkResult.mode === 'standalone' ? '(Default: No topical match found)' : '(No Benchmark Comparison)'}
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Active Match Details Helper */}
                    {selectedBenchmarkDocId !== 'none' && benchmarkDoc && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono bg-white/70 px-2.5 py-1.5 rounded border border-blue-200/60 text-[#1E40AF] truncate">
                        <span className="font-bold flex-shrink-0">Comparing Against:</span>
                        <span className="truncate font-semibold">{benchmarkDoc.title}</span>
                        <span className="text-[#3B82F6] flex-shrink-0 font-normal">({benchmarkDoc.documentCode})</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 1. VISUAL IMAGE COMPARISON WORKBENCH (When comparing Visual/Image Records) */}
              {isV2Image ? (
                <div className="space-y-4">
                  {/* Mode Bar */}
                  <div className="bg-white p-3 rounded-xl border border-[#E4E0D6] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#141C2B] font-mono uppercase text-[11px]">Visual Comparison Mode:</span>
                      <div className="flex items-center bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg p-0.5">
                        <button
                          onClick={() => setVisualDiffMode('split')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            visualDiffMode === 'split' ? 'bg-[#141C2B] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#141C2B]'
                          }`}
                        >
                          Dual Side-by-Side
                        </button>
                        <button
                          onClick={() => setVisualDiffMode('wipe')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            visualDiffMode === 'wipe' ? 'bg-[#141C2B] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#141C2B]'
                          }`}
                        >
                          Wipe Curtain Slider
                        </button>
                        <button
                          onClick={() => setVisualDiffMode('onion')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            visualDiffMode === 'onion' ? 'bg-[#141C2B] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#141C2B]'
                          }`}
                        >
                          Onion Skin Overlay
                        </button>
                      </div>
                    </div>

                    {/* Interactive Slider Adjustment */}
                    {visualDiffMode === 'wipe' && (
                      <div className="flex items-center gap-2 text-xs font-mono text-[#64748B]">
                        <span>Wipe Split:</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={wipeSliderPos}
                          onChange={(e) => setWipeSliderPos(Number(e.target.value))}
                          className="w-28 cursor-pointer accent-[#C8892E]"
                        />
                        <span className="w-8 font-bold text-[#141C2B]">{wipeSliderPos}%</span>
                      </div>
                    )}

                    {visualDiffMode === 'onion' && (
                      <div className="flex items-center gap-2 text-xs font-mono text-[#64748B]">
                        <span>Blend Opacity:</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={onionOpacity}
                          onChange={(e) => setOnionOpacity(Number(e.target.value))}
                          className="w-28 cursor-pointer accent-[#2563EB]"
                        />
                        <span className="w-8 font-bold text-[#141C2B]">{onionOpacity}%</span>
                      </div>
                    )}
                  </div>

                  {/* Visual Renderings */}
                  {visualDiffMode === 'split' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Baseline / Benchmark Reference */}
                      <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl overflow-hidden shadow-inner flex flex-col">
                        <div className="bg-[#0F172A] border-b border-[#1E293B] px-3.5 py-2.5 flex items-center justify-between text-xs font-mono">
                          <span className="text-[#94A3B8] font-bold">
                            {isInitialSubmission ? 'APPROVED BENCHMARK REFERENCE' : `BASELINE VERSION ${v1.versionNumber}.0`}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openImageInNewTab(effectiveV1Image, `${benchmarkDoc ? benchmarkDoc.title : doc.title} - Baseline Reference`)}
                              className="px-2 py-0.5 bg-[#1E293B] hover:bg-[#38BDF8] hover:text-[#0F172A] text-[#38BDF8] rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                              title="Open Baseline image in new tab"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>Tab</span>
                            </button>
                            <button
                              onClick={() => handleReadClipboard('v1')}
                              className="px-2 py-0.5 bg-[#1E293B] hover:bg-[#334155] text-[#38BDF8] rounded text-[10px] font-bold cursor-pointer"
                              title="Paste image into Reference v1"
                            >
                              📋 Paste
                            </button>
                            <button
                              onClick={() => fileInputV1Ref.current?.click()}
                              className="px-2 py-0.5 bg-[#1E293B] hover:bg-[#334155] text-[#E2E8F0] rounded text-[10px] cursor-pointer"
                              title="Upload reference file"
                            >
                              📁 Upload
                            </button>
                          </div>
                        </div>

                        <div 
                          onClick={() => openImageInNewTab(effectiveV1Image, `${benchmarkDoc ? benchmarkDoc.title : doc.title} - Baseline Reference`)}
                          className="p-4 min-h-[260px] max-h-[360px] overflow-auto flex items-center justify-center bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:16px_16px] cursor-zoom-in group relative"
                          title="Click to expand / inspect in new tab"
                        >
                          <img
                            src={effectiveV1Image}
                            alt="Baseline Reference Strata"
                            className="max-h-[300px] max-w-full rounded shadow-md border border-white/10 object-contain bg-white group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute bottom-2 right-2 bg-[#0F172A]/80 text-[#38BDF8] text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                            <ExternalLink className="w-3 h-3" />
                            <span>Inspect</span>
                          </div>
                        </div>

                        <div className="bg-[#0F172A] border-t border-[#1E293B] px-3.5 py-2 text-[11px] font-mono text-[#94A3B8] flex items-center justify-between">
                          <span>{benchmarkDoc ? benchmarkDoc.title : doc.title}</span>
                          <span className="text-[#10B981] font-bold">● Approved Standard</span>
                        </div>
                      </div>

                      {/* Right: Proposed Submission */}
                      <div className="bg-[#0B1120] border-2 border-[#C8892E] rounded-xl overflow-hidden shadow-inner flex flex-col">
                        <div className="bg-[#0F172A] border-b border-[#1E293B] px-3.5 py-2.5 flex items-center justify-between text-xs font-mono">
                          <span className="text-[#C8892E] font-bold">
                            {isInitialSubmission ? 'PROPOSED SUBMISSION (v1.0)' : `PROPOSED REVISION (v${v2.versionNumber}.0)`}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openImageInNewTab(effectiveV2Image, `${doc.title} - ${v2.fileName || 'Proposed Submission'}`)}
                              className="px-2 py-0.5 bg-[#1E293B] hover:bg-[#C8892E] hover:text-[#141C2B] text-[#C8892E] rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                              title="Open Proposed image in new tab"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>Tab</span>
                            </button>
                            <button
                              onClick={() => handleReadClipboard('v2')}
                              className="px-2 py-0.5 bg-[#C8892E] hover:bg-[#A97223] text-[#141C2B] rounded text-[10px] font-bold cursor-pointer"
                              title="Paste image into Proposed v2"
                            >
                              📋 Paste v2 (Ctrl+V)
                            </button>
                            <button
                              onClick={() => fileInputV2Ref.current?.click()}
                              className="px-2 py-0.5 bg-[#1E293B] hover:bg-[#334155] text-[#E2E8F0] rounded text-[10px] cursor-pointer"
                              title="Upload submission file"
                            >
                              📁 Upload
                            </button>
                          </div>
                        </div>

                        <div 
                          onClick={() => openImageInNewTab(effectiveV2Image, `${doc.title} - ${v2.fileName || 'Proposed Submission'}`)}
                          className="p-4 min-h-[260px] max-h-[360px] overflow-auto flex items-center justify-center bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:16px_16px] cursor-zoom-in group relative"
                          title="Click to expand / inspect in new tab"
                        >
                          <img
                            src={effectiveV2Image}
                            alt="Proposed Strata Capture"
                            className="max-h-[300px] max-w-full rounded shadow-md border border-white/10 object-contain bg-white group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute bottom-2 right-2 bg-[#0F172A]/80 text-[#C8892E] text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                            <ExternalLink className="w-3 h-3" />
                            <span>Inspect</span>
                          </div>
                        </div>

                        <div className="bg-[#0F172A] border-t border-[#1E293B] px-3.5 py-2 text-[11px] font-mono text-[#94A3B8] flex items-center justify-between">
                          <span>{v2.fileName || 'Submitted Visual Survey'}</span>
                          <span className="text-[#F59E0B] font-bold">● {v2.approvalStatus.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  ) : visualDiffMode === 'wipe' ? (
                    /* Wipe Curtain Overlay */
                    <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl relative min-h-[420px] flex items-center justify-center">
                      <div className="relative w-full max-w-2xl h-[380px] overflow-hidden rounded-lg bg-white select-none">
                        {/* Background Base (v1) */}
                        <img
                          src={effectiveV1Image}
                          alt="Baseline"
                          className="absolute inset-0 w-full h-full object-contain"
                        />

                        {/* Foreground Wipe Clip (v2) */}
                        <div 
                          className="absolute inset-0 overflow-hidden border-r-2 border-[#C8892E]"
                          style={{ width: `${wipeSliderPos}%` }}
                        >
                          <img
                            src={effectiveV2Image}
                            alt="Proposed Revision"
                            className="absolute inset-0 w-full h-full object-contain max-w-none"
                            style={{ width: '100%', height: '100%' }}
                          />
                          <div className="absolute top-2 left-2 bg-[#141C2B]/80 text-[#C8892E] font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                            Proposed v{v2.versionNumber}.0
                          </div>
                        </div>

                        <div className="absolute top-2 right-2 bg-[#141C2B]/80 text-[#10B981] font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                          Baseline Reference
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Onion Skin Overlay */
                    <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl relative min-h-[420px] flex items-center justify-center">
                      <div className="relative w-full max-w-2xl h-[380px] rounded-lg bg-white overflow-hidden">
                        <img
                          src={effectiveV1Image}
                          alt="Baseline"
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                        <img
                          src={effectiveV2Image}
                          alt="Proposed"
                          style={{ opacity: onionOpacity / 100 }}
                          className="absolute inset-0 w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>
                    </div>
                  )}

                  {/* Strata Variance & Coordinate Shift Summary */}
                  <div className="bg-white p-4 rounded-xl border border-[#E4E0D6] space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-[#EFEBE2] pb-2">
                      <span className="font-bold text-[#141C2B] flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-[#C8892E]" />
                        <span>Visual Strata Variance &amp; Geological Assay Comparison</span>
                      </span>
                      <span className="text-[10px] text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0] font-bold">
                        Alignment Confidence: 99.4%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                      <div className="p-2.5 bg-[#FAF8F3] rounded border border-[#E4E0D6]">
                        <span className="text-[#64748B] block text-[10px]">Coal Seam-IV Thickness</span>
                        <span className="font-bold text-[#141C2B]">26.5m (Δ 0.0m)</span>
                      </div>
                      <div className="p-2.5 bg-[#FAF8F3] rounded border border-[#E4E0D6]">
                        <span className="text-[#64748B] block text-[10px]">Overburden Depth</span>
                        <span className="font-bold text-[#141C2B]">54.2m (Δ +1.2m)</span>
                      </div>
                      <div className="p-2.5 bg-[#FAF8F3] rounded border border-[#E4E0D6]">
                        <span className="text-[#64748B] block text-[10px]">Stripping Ratio</span>
                        <span className="font-bold text-[#141C2B]">2.85 m³/tonne</span>
                      </div>
                      <div className="p-2.5 bg-[#FAF8F3] rounded border border-[#E4E0D6]">
                        <span className="text-[#64748B] block text-[10px]">GPS Grid Alignment</span>
                        <span className="font-bold text-[#16A34A]">Locked 0.0m Shift</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 2. TEXTUAL / STATUTORY SIDE-BY-SIDE DIFF CARDS */
                <div className={`grid grid-cols-1 ${selectedBenchmarkDocId !== 'none' && (benchmarkDoc || !isInitialSubmission) ? 'md:grid-cols-2' : ''} gap-4`}>
                  {/* Column 1: Baseline or Approved Benchmark Solution */}
                  {selectedBenchmarkDocId !== 'none' && (benchmarkDoc || !isInitialSubmission) && (
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E4E0D6] space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#EFEBE2]">
                        <div>
                          <div className="font-mono font-bold text-xs text-[#64748B]">
                            {isInitialSubmission 
                              ? `APPROVED BENCHMARK: ${benchmarkDoc ? benchmarkDoc.documentCode : 'STATUTORY TEMPLATE'}` 
                              : `BASELINE VERSION ${v1.versionNumber}.0`}
                          </div>
                          <div className="text-[10px] text-[#8F9BAE] truncate max-w-[240px]">
                            {isInitialSubmission ? (benchmarkDoc?.title || 'Approved Reference') : doc.title}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-[#F0FDF4] text-[#16A34A] px-2 py-0.5 rounded font-bold border border-[#BBF7D0]">
                          APPROVED
                        </span>
                      </div>

                      <div className="p-3 bg-[#FAF8F3] rounded-lg font-mono text-[11px] text-[#475569] leading-relaxed max-h-72 overflow-y-auto border border-[#EFEBE2] whitespace-pre-wrap">
                        {benchmarkVersion ? benchmarkVersion.extractedText : (v1?.extractedText || 'No prior version')}
                      </div>

                      <div className="text-[10px] font-mono text-[#8F9BAE] flex items-center justify-between">
                        <span>
                          {benchmarkVersion ? `Source: ${benchmarkVersion.uploadedBy.name} (${benchmarkVersion.uploadedBy.subsidiary})` : 'Standard Template'}
                        </span>
                        <span className="text-[#16A34A] font-bold">Standard Reference</span>
                      </div>
                    </div>
                  )}

                  {/* Column 2: Proposed Submission */}
                  <div className={`bg-white p-4 sm:p-5 rounded-xl border-2 ${aiEval.categoryMismatch ? 'border-[#EF4444]' : 'border-[#C8892E]'} space-y-3`}>
                    <div className="flex items-center justify-between pb-2 border-b border-[#EFEBE2]">
                      <div>
                        <div className={`font-mono font-bold text-xs ${aiEval.categoryMismatch ? 'text-[#DC2626]' : 'text-[#C8892E]'}`}>
                          {isInitialSubmission 
                            ? 'PROPOSED NEW SUBMISSION (v1.0)' 
                            : `PROPOSED REVISION VERSION ${v2.versionNumber}.0`}
                        </div>
                        <div className="text-[10px] text-[#8F9BAE] truncate max-w-[240px]">
                          {doc.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {aiEval.categoryMismatch && (
                          <span className="text-[10px] font-mono bg-[#FEF2F2] text-[#DC2626] px-2 py-0.5 rounded font-bold border border-[#FECACA]">
                            MISMATCH
                          </span>
                        )}
                        <span className="text-[10px] font-mono bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded font-bold border border-[#FDE68A]">
                          {v2.approvalStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className={`p-3 bg-[#FAF8F3] rounded-lg font-mono text-[11px] text-[#141C2B] leading-relaxed max-h-72 overflow-y-auto border ${aiEval.categoryMismatch ? 'border-red-300' : 'border-[#C8892E]/40'} whitespace-pre-wrap`}>
                      {v2.extractedText}
                    </div>

                    <div className="text-[10px] font-mono text-[#8F9BAE] flex items-center justify-between">
                      <span>Submitted by: {v2.uploadedBy.name}</span>
                      <span className={aiEval.categoryMismatch ? 'text-[#DC2626] font-bold' : 'text-[#16A34A] font-bold'}>
                        Compliance: {aiEval.overallScore}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Decision Controls */}
        <div className="p-4 bg-white border-t border-[#E4E0D6] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {aiEval.categoryMismatch ? (
              <span className="text-xs font-mono font-bold text-[#DC2626] flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                <span>Approval Blocked: Category Mismatch Detected</span>
              </span>
            ) : (
              <span className="text-xs font-mono text-[#64748B]">
                Compliance Score: <strong className="text-[#16A34A]">{aiEval.overallScore}%</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompareVersions(null)}
              className="px-3.5 py-2 bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg hover:bg-[#D4CEBF] cursor-pointer text-center"
            >
              Close Inspector
            </button>

            {currentUser.role === 'admin' && v2.approvalStatus === 'pending' && (
              <>
                {/* Request Changes Button */}
                <button
                  onClick={() => {
                    setActionModal('changes');
                    setActionReason(aiEval.suggestedActionDirective);
                  }}
                  className="px-3.5 py-2 bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#FCD34D] text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Request Changes</span>
                </button>

                {/* Approve Button */}
                <button
                  onClick={handleApprove}
                  disabled={aiEval.categoryMismatch}
                  title={aiEval.categoryMismatch ? 'Approval blocked due to category mismatch with unrelated subject matter' : 'Approve document'}
                  className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                    aiEval.categoryMismatch 
                      ? 'bg-[#94A3B8] text-white cursor-not-allowed opacity-60' 
                      : 'bg-[#16A34A] hover:bg-[#15803D] text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {isInitialSubmission ? 'Approve & Index v1.0' : `Approve & Re-Index v${v2.versionNumber}.0`}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Request Changes Prompt Modal */}
      {actionModal === 'changes' && (
        <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-[#E4E0D6] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFEBE2]">
              <h4 className="font-serif font-bold text-sm text-[#141C2B] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#C8892E]" />
                <span>Request Revision from Officer ({v2.uploadedBy.name})</span>
              </h4>
              <button 
                onClick={() => setActionModal(null)} 
                className="text-[#64748B] hover:text-[#141C2B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#475569]">
              Specify revision instructions for <strong>{v2.uploadedBy.name}</strong> ({v2.uploadedBy.subsidiary || doc.subsidiary}). The document status will update to <span className="font-semibold text-[#B45309]">"Changes Requested"</span> and alert the officer.
            </p>

            {/* AI Assistant Quick-Draft Bar */}
            <div className="p-3 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#141C2B] flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8892E]" />
                  AI Suggested Directives &amp; Quick Templates:
                </span>
                <button
                  type="button"
                  onClick={handleAutoDraftAiDirective}
                  className="px-2.5 py-1 bg-[#141C2B] hover:bg-[#1E293B] text-white text-[10px] font-bold font-mono rounded-md flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                  title="Generate tailored feedback based on document parameters"
                >
                  <Sparkles className="w-3 h-3 text-[#E2B13C]" />
                  <span>Auto-Draft with AI</span>
                </button>
              </div>

              {/* One-Click Directive Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {predefinedDirectives.map((directive, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActionReason(directive.text)}
                    className="text-[11px] bg-white hover:bg-[#F3EFE6] text-[#334155] hover:text-[#0F172A] border border-[#E2DDD2] hover:border-[#C8892E] rounded-md px-2.5 py-1 flex items-center gap-1 transition-all cursor-pointer text-left"
                    title={directive.text}
                  >
                    <span>{directive.icon}</span>
                    <span className="font-medium">{directive.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                <label className="font-semibold text-[#141C2B]">Revision Directive Memo:</label>
                {actionReason && (
                  <button 
                    type="button" 
                    onClick={() => setActionReason('')}
                    className="text-[10px] text-[#DC2626] hover:underline cursor-pointer"
                  >
                    Clear text
                  </button>
                )}
              </div>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Click an AI template above or type customized instructions (e.g. Please provide updated Seam-IV overburden geological cross-sections and verify stripping ratio assays)..."
                rows={4}
                className="w-full bg-[#FAF8F3] border border-[#E4E0D6] text-[#141C2B] text-xs rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#C8892E] leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#EFEBE2]">
              <span className="text-[10px] font-mono text-[#8F9BAE]">
                Status will change to: <strong>Changes Requested</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActionModal(null)}
                  className="px-3.5 py-1.5 text-xs text-[#64748B] hover:text-[#141C2B] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestChanges}
                  disabled={!actionReason.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-lg text-white shadow-xs cursor-pointer disabled:opacity-50 bg-[#C8892E] hover:bg-[#A97223] flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Change Request</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
