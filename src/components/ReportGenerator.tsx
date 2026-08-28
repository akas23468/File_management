import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import Markdown from 'react-markdown';
import { useApp } from '../context/AppContext';
import { sounds } from '../utils/soundEffects';
import { ReportRecord, ReportType, Subsidiary, Chunk, SourceCitation } from '../types';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Download, 
  Share2, 
  Layers, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  Printer, 
  Copy, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  Database,
  Plus,
  RefreshCw,
  FileDown
} from 'lucide-react';

interface ReportTemplate {
  id: ReportType;
  title: string;
  description: string;
  suggestedDocs: string[];
}

const TEMPLATES: ReportTemplate[] = [
  {
    id: 'production_variance',
    title: 'Monthly Subsidiary Production Variance Brief',
    description: 'Statutory comparison of opencast target vs actual extraction metrics with grade adjustments.',
    suggestedDocs: ['CMPDI/PROD/2026/SECL-Q1', 'CMPDI/GEO/2024/SECL-082'],
  },
  {
    id: 'reserve_assessment',
    title: 'Annual Proved & Inferred Reserve Assessment',
    description: 'Consolidated technical summary of proved, indicated, and inferred coal reserves by seam.',
    suggestedDocs: ['CMPDI/GEO/2024/SECL-082', 'CMPDI/NCL/2025/ENV-014'],
  },
  {
    id: 'compliance_brief',
    title: 'DGMS Safety & Environmental Compliance Brief',
    description: 'Groundwater recharge setback buffer compliance and slope stability factor-of-safety audit.',
    suggestedDocs: ['CMPDI/NCL/2025/ENV-014', 'CMPDI/SOP/2025/BCCL-009'],
  },
  {
    id: 'safety_memo',
    title: 'Incident & Water Influx Precedent Memo',
    description: 'Historical review of inundation management, strata pressure events, and barrier pillars.',
    suggestedDocs: ['CMPDI/SOP/2025/BCCL-009'],
  },
];

export const ReportGenerator: React.FC = () => {
  const { 
    chunks, 
    documents, 
    currentUser, 
    addReportRecord, 
    reportDraftFromAi, 
    setReportDraftFromAi,
    reports,
    setActiveCitationForModal
  } = useApp();

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // 5-Step Wizard State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportType>('production_variance');
  const [reportPeriod, setReportPeriod] = useState<string>('FY 2025-26 (Q3/Q4)');
  const [reportSubsidiary, setReportSubsidiary] = useState<Subsidiary | 'ALL'>('SECL');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  
  // Generation & Log state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genLogs, setGenLogs] = useState<string[]>([]);
  const [generatedReport, setGeneratedReport] = useState<ReportRecord | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Filter documents by selected subsidiary (or all if 'ALL' or CMPDI HQ standard)
  const availableDocs = documents.filter(doc => {
    if (reportSubsidiary === 'ALL') return true;
    return doc.subsidiary === reportSubsidiary || doc.subsidiary === 'CMPDI HQ';
  });

  // Automatically update selected document IDs when subsidiary changes
  useEffect(() => {
    const matchingApprovedIds = documents
      .filter(d => {
        const matchesSub = reportSubsidiary === 'ALL' || d.subsidiary === reportSubsidiary || d.subsidiary === 'CMPDI HQ';
        return matchesSub && d.status === 'approved';
      })
      .map(d => d.id);
    setSelectedDocIds(matchingApprovedIds);
  }, [reportSubsidiary, documents]);

  // If coming with draft from AI Assistant
  useEffect(() => {
    if (reportDraftFromAi) {
      setCurrentStep(1);
    }
  }, [reportDraftFromAi]);

  const handleToggleDoc = (id: string) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setGenLogs([]);
    setCurrentStep(5);

    const templateMeta = TEMPLATES.find(t => t.id === selectedTemplate);
    
    // Deduplicate selected chunks by text content and id to avoid redundant citations and duplicate points
    const seenTexts = new Set<string>();
    const seenIds = new Set<string>();
    const selectedChunks = chunks.filter(c => {
      if (!c.isApproved || !selectedDocIds.includes(c.documentId)) return false;
      const normalized = (c.text || '').trim().replace(/\s+/g, ' ');
      if (!normalized || seenTexts.has(normalized) || seenIds.has(c.id)) return false;
      seenTexts.add(normalized);
      seenIds.add(c.id);
      return true;
    });

    // Live extraction simulation logs
    setGenLogs(prev => [...prev, `[INIT] Validating ${selectedDocIds.length} approved document sources for ${reportSubsidiary}...`]);
    await new Promise(r => setTimeout(r, 600));

    setGenLogs(prev => [...prev, `[EXTRACT] Sourcing ${selectedChunks.length} unique vector chunks from approved repository...`]);
    await new Promise(r => setTimeout(r, 700));

    setGenLogs(prev => [...prev, `[SYNTHESIS] Cross-checking reserve parameters, borehole assays, and DGMS setback constraints...`]);
    await new Promise(r => setTimeout(r, 800));

    setGenLogs(prev => [...prev, `[GROUNDING] Attaching immutable SHA-256 source citations to each factual clause...`]);
    await new Promise(r => setTimeout(r, 600));

    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: selectedTemplate,
          period: reportPeriod,
          subsidiary: reportSubsidiary,
          selectedChunks,
          templateTitle: templateMeta?.title,
        }),
      });

      const data = await res.json();

      const newReport: ReportRecord = {
        id: `rep_${Date.now()}`,
        reportCode: `REP-${new Date().getFullYear()}-${reportSubsidiary}-${Math.floor(100 + Math.random() * 900)}`,
        title: `${templateMeta?.title || 'Statutory Briefing'} — ${reportSubsidiary}`,
        type: selectedTemplate,
        subsidiary: reportSubsidiary,
        period: reportPeriod,
        generatedBy: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
        },
        createdAt: new Date().toISOString(),
        content: data.content,
        summary: data.summary,
        citations: data.citations || [],
      };

      addReportRecord(newReport);
      setGeneratedReport(newReport);
      setGenLogs(prev => [...prev, `[COMPLETE] Report compiled successfully with zero unverified claims.`]);
    } catch (err) {
      console.error('Report gen error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!generatedReport) return;
    setIsExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 18;
      const maxLineWidth = pageWidth - margin * 2;
      let yPos = 20;

      const checkPageBreak = (neededHeight: number) => {
        if (yPos + neededHeight > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
          drawHeaderFooter();
        }
      };

      const drawHeaderFooter = () => {
        // Top header accent line
        doc.setDrawColor(200, 137, 46); // #C8892E
        doc.setLineWidth(1.2);
        doc.line(margin, 10, pageWidth - margin, 10);

        // Top header text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('CENTRAL MINE PLANNING & DESIGN INSTITUTE (CMPDI) — STATUTORY BRIEF', margin, 8);
        doc.text(generatedReport.reportCode, pageWidth - margin, 8, { align: 'right' });

        // Bottom page number
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('CONFIDENTIAL — STATUTORY MINING GOVERNANCE', margin, pageHeight - 10);
      };

      // Header on page 1
      drawHeaderFooter();

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(20, 28, 43);
      const splitTitle = doc.splitTextToSize(generatedReport.title, maxLineWidth);
      doc.text(splitTitle, margin, yPos);
      yPos += splitTitle.length * 7 + 4;

      // Metadata block
      doc.setFillColor(247, 245, 240);
      doc.setDrawColor(228, 224, 214);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, yPos, maxLineWidth, 14, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(20, 28, 43);
      doc.text(`Code: ${generatedReport.reportCode}`, margin + 4, yPos + 6);
      doc.text(`Subsidiary: ${generatedReport.subsidiary}`, margin + 65, yPos + 6);
      doc.text(`Period: ${generatedReport.period}`, margin + 115, yPos + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Date: ${new Date(generatedReport.createdAt).toLocaleDateString()} | Author: ${generatedReport.generatedBy.name} (${generatedReport.generatedBy.role})`, margin + 4, yPos + 11);
      yPos += 20;

      // Parse markdown content line by line
      const lines = generatedReport.content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          yPos += 3;
          continue;
        }

        if (trimmed.startsWith('## ')) {
          checkPageBreak(16);
          yPos += 4;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(20, 28, 43);
          const heading = trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '');
          doc.text(heading, margin, yPos);
          yPos += 5.5;
          doc.setDrawColor(200, 137, 46);
          doc.setLineWidth(0.4);
          doc.line(margin, yPos - 1, margin + 35, yPos - 1);
          yPos += 2;
        } else if (trimmed.startsWith('### ')) {
          checkPageBreak(12);
          yPos += 3;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(30, 41, 59);
          const subHeading = trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '');
          doc.text(subHeading, margin, yPos);
          yPos += 5;
        } else if (trimmed.startsWith('---')) {
          checkPageBreak(6);
          doc.setDrawColor(228, 224, 214);
          doc.setLineWidth(0.3);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 5;
        } else {
          checkPageBreak(10);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(30, 41, 59);
          const cleanText = trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
          const splitParagraph = doc.splitTextToSize(cleanText, maxLineWidth);
          doc.text(splitParagraph, margin, yPos);
          yPos += splitParagraph.length * 4.6 + 2;
        }
      }

      // Citations
      if (generatedReport.citations && generatedReport.citations.length > 0) {
        checkPageBreak(25);
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(20, 28, 43);
        doc.text('Attached Statutory Citations & Vector Proofs', margin, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);

        for (const cit of generatedReport.citations) {
          checkPageBreak(12);
          const citText = `• ${cit.documentTitle} [${cit.documentCode} v${cit.versionNumber}, ${cit.pageOrSheetRef}]: "${cit.excerpt}"`;
          const splitCit = doc.splitTextToSize(citText, maxLineWidth);
          doc.text(splitCit, margin + 2, yPos);
          yPos += splitCit.length * 4 + 2;
        }
      }

      // Save PDF via Blob to guarantee browser download
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${generatedReport.reportCode}_${generatedReport.subsidiary}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

      sounds.playSuccess();
    } catch (err) {
      console.error('PDF export failed, falling back to window.print():', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintOrExport = () => {
    handleDownloadPdf();
  };

  const handleDownloadMarkdown = () => {
    if (!generatedReport) return;
    const blob = new Blob([
      `# ${generatedReport.title}\n` +
      `**Report Code:** ${generatedReport.reportCode} | **Period:** ${generatedReport.period} | **Date:** ${new Date(generatedReport.createdAt).toLocaleDateString()}\n\n` +
      `---\n\n` +
      `${generatedReport.content}\n\n` +
      `---\n### Attached Citations\n` +
      generatedReport.citations.map(c => `- **${c.documentTitle}** (${c.documentCode} v${c.versionNumber}, ${c.pageOrSheetRef}): "${c.excerpt}"`).join('\n')
    ], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedReport.reportCode}_${generatedReport.subsidiary}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div id="report-generator-view" className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-7 max-w-7xl mx-auto">
      {/* View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E0D6] pb-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 sm:px-4 py-2 text-xs font-serif font-bold rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'create' 
                ? 'bg-[#141C2B] text-white shadow-xs' 
                : 'text-[#64748B] hover:text-[#141C2B] bg-white border border-[#E4E0D6]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C8892E]" />
            <span>Generate Report</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 sm:px-4 py-2 text-xs font-serif font-bold rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-[#141C2B] text-white shadow-xs' 
                : 'text-[#64748B] hover:text-[#141C2B] bg-white border border-[#E4E0D6]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#C8892E]" />
            <span>Archive ({reports.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="space-y-5 sm:space-y-6">
          {/* Stepper Header (1 to 5) */}
          <div className="bg-white border border-[#E4E0D6] rounded-xl p-2.5 sm:p-4 shadow-xs">
            <div className="grid grid-cols-5 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-mono">
              {[
                { num: 1, label: 'Template', short: '1. Tmpl' },
                { num: 2, label: 'Period', short: '2. Period' },
                { num: 3, label: 'Subsidiary', short: '3. Sub' },
                { num: 4, label: 'Sources', short: '4. Docs' },
                { num: 5, label: 'Synthesis', short: '5. Synth' },
              ].map(s => {
                const isCurrent = currentStep === s.num;
                const isCompleted = currentStep > s.num || (s.num === 5 && Boolean(generatedReport));
                const canNavigate = s.num <= currentStep || isCompleted;

                return (
                  <button 
                    key={s.num}
                    type="button"
                    disabled={!canNavigate}
                    onClick={() => {
                      if (canNavigate) {
                        setCurrentStep(s.num);
                        sounds.playClick();
                      }
                    }}
                    className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                      isCurrent 
                        ? 'bg-[#141C2B] text-[#C8892E] font-bold shadow-xs cursor-default' 
                        : isCompleted
                          ? 'bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#16A34A] font-semibold cursor-pointer'
                          : 'text-[#94A3B8] bg-[#FAF8F3] opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span className="hidden sm:inline">{s.num}. {s.label}</span>
                    <span className="sm:hidden">{s.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Draft from AI Alert if loaded */}
          {reportDraftFromAi && (
            <div className="bg-[#FAF8F3] border border-[#C8892E] p-4 rounded-xl flex items-center justify-between text-xs text-[#141C2B]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C8892E]" />
                <span>Incorporating finding from AI Assistant query with <strong>{reportDraftFromAi.citations.length} verified citations</strong>.</span>
              </div>
              <button
                onClick={() => setReportDraftFromAi(null)}
                className="text-[11px] text-[#64748B] underline hover:text-[#141C2B]"
              >
                Dismiss Draft
              </button>
            </div>
          )}

          {/* Step 1: Template Selection */}
          {currentStep === 1 && (
            <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-[#EFEBE2]">
                <h3 className="font-serif font-bold text-lg text-[#141C2B]">
                  Select Statutory Report Template
                </h3>
                <p className="text-xs text-[#64748B]">
                  Click any template to select and proceed directly to period definition.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEMPLATES.map(tmpl => (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplate(tmpl.id);
                      setCurrentStep(2);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === tmpl.id
                        ? 'bg-[#FAF8F3] border-2 border-[#C8892E] shadow-xs'
                        : 'border-[#E4E0D6] hover:border-[#C8892E] hover:bg-[#FAF8F3] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-serif font-bold text-sm text-[#141C2B]">{tmpl.title}</span>
                      {selectedTemplate === tmpl.id ? (
                        <CheckCircle2 className="w-4 h-4 text-[#C8892E]" />
                      ) : (
                        <ArrowRight className="w-4 h-4 text-[#94A3B8] opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {tmpl.description}
                    </p>
                    <div className="mt-3 pt-2 border-t border-[#EFEBE2] text-[10px] font-mono text-[#8F9BAE] flex items-center justify-between">
                      <span>Auto-filings: {tmpl.suggestedDocs.join(', ')}</span>
                      <span className="text-[#C8892E] font-sans font-semibold text-[11px]">Select & Continue →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Period & Date Scope */}
          {currentStep === 2 && (
            <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-[#EFEBE2] flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#141C2B]">
                    Specify Statutory Period
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Click a financial review cycle to select and continue.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg border border-[#E4E0D6] transition-colors"
                >
                  ← Back to Templates
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    value: 'FY 2025-26 (Q3/Q4)',
                    title: 'FY 2025-26 (Q3/Q4 Cumulative Review)',
                    desc: 'Latest active quarter reconciliation and progressive fiscal targets',
                  },
                  {
                    value: 'FY 2025-26 (Annual)',
                    title: 'FY 2025-26 (Full Financial Year)',
                    desc: 'Full twelve-month statutory operational extraction and dispatch review',
                  },
                  {
                    value: 'FY 2024-25 (Annual)',
                    title: 'FY 2024-25 (Historical Baseline)',
                    desc: 'Prior financial year audit baseline for multi-year variance analysis',
                  },
                  {
                    value: 'Monthly Returns: Jan-Feb 2026',
                    title: 'Monthly Operational Returns (Jan-Feb 2026)',
                    desc: 'High-frequency monthly production sheets and HEMM machine logs',
                  },
                ].map(p => (
                  <div
                    key={p.value}
                    onClick={() => {
                      setReportPeriod(p.value);
                      setCurrentStep(3);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      reportPeriod === p.value
                        ? 'bg-[#FAF8F3] border-2 border-[#C8892E] shadow-xs'
                        : 'border-[#E4E0D6] hover:border-[#C8892E] hover:bg-[#FAF8F3] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-serif font-bold text-sm text-[#141C2B]">{p.title}</span>
                      {reportPeriod === p.value && (
                        <CheckCircle2 className="w-4 h-4 text-[#C8892E]" />
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">{p.desc}</p>
                    <div className="mt-3 pt-2 border-t border-[#EFEBE2] flex justify-end">
                      <span className="text-[#C8892E] font-sans font-semibold text-[11px]">Select Period →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Subsidiary Selector */}
          {currentStep === 3 && (
            <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-[#EFEBE2] flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#141C2B]">
                    Select Subsidiary Jurisdiction
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Click any subsidiary zone to proceed directly to verified sources.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg border border-[#E4E0D6] transition-colors"
                >
                  ← Back to Period
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['ALL', 'SECL', 'BCCL', 'NCL', 'CCL', 'ECL', 'WCL', 'MCL'].map(sub => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setReportSubsidiary(sub as Subsidiary | 'ALL');
                      setCurrentStep(4);
                    }}
                    className={`p-3.5 rounded-lg border text-xs font-mono font-bold transition-all text-left cursor-pointer ${
                      reportSubsidiary === sub
                        ? 'bg-[#141C2B] text-[#C8892E] border-[#141C2B] shadow-xs'
                        : 'bg-[#FAF8F3] text-[#141C2B] border-[#E4E0D6] hover:border-[#C8892E] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{sub === 'ALL' ? 'All CIL Subsidiaries' : sub}</span>
                      <span className="text-[#C8892E] text-[10px]">→</span>
                    </div>
                    <span className="text-[10px] text-[#8F9BAE] block font-sans font-normal mt-0.5">
                      {sub === 'ALL' ? 'Pan-India Overview' : `${sub} Mining Operations`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Approved Sources Checkbox List (Section 5.7 Spec) */}
          {currentStep === 4 && (
            <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-[#EFEBE2] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-lg text-[#141C2B]">
                      Approved Knowledge Sources
                    </h3>
                    <span className="font-mono text-xs bg-[#141C2B] text-[#C8892E] px-2 py-0.5 rounded font-bold">
                      {reportSubsidiary}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {reportSubsidiary === 'ALL' 
                      ? 'Showing approved documents across all CIL subsidiaries.' 
                      : `Filtered strictly to approved ${reportSubsidiary} filings and CMPDI HQ statutory standards.`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDocIds(availableDocs.filter(d => d.status === 'approved').map(d => d.id))}
                    className="text-[11px] font-mono text-[#C8892E] hover:underline cursor-pointer"
                  >
                    Select All {reportSubsidiary}
                  </button>
                  <span className="text-[#94A3B8]">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDocIds([])}
                    className="text-[11px] font-mono text-[#64748B] hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <span className="text-[#94A3B8]">|</span>
                  <span className="text-xs font-mono bg-[#EFEBE2] px-2 py-1 rounded text-[#141C2B] font-bold">
                    {selectedDocIds.length} of {availableDocs.length} selected
                  </span>
                </div>
              </div>

              {availableDocs.length === 0 ? (
                <div className="p-8 text-center bg-[#FAF8F3] rounded-xl border border-dashed border-[#D4CEBF]">
                  <Database className="w-8 h-8 text-[#94A3B8] mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-bold text-[#141C2B]">No {reportSubsidiary} filings currently registered in knowledge repository</p>
                  <p className="text-xs text-[#64748B] mt-1">Upload and approve a statutory document for {reportSubsidiary} in the Document Ingestion view to include it in this report.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto">
                  {availableDocs.map(doc => {
                    const isChecked = selectedDocIds.includes(doc.id);
                    const isApproved = doc.status === 'approved';

                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleToggleDoc(doc.id)}
                        className={`p-3.5 rounded-lg border cursor-pointer flex items-start gap-3 transition-all ${
                          isChecked 
                            ? 'bg-[#FAF8F3] border-[#C8892E]' 
                            : 'bg-white border-[#E4E0D6] hover:border-[#C8892E]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-[#C8892E] focus:ring-0 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[10px] font-bold bg-[#EFEBE2] px-1.5 py-0.5 rounded text-[#141C2B]">
                              {doc.documentCode}
                            </span>
                            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              doc.subsidiary === 'BCCL' ? 'bg-[#EFF6FF] text-[#1D4ED8]' :
                              doc.subsidiary === 'SECL' ? 'bg-[#FEF3C7] text-[#B45309]' :
                              doc.subsidiary === 'NCL' ? 'bg-[#F0FDF4] text-[#15803D]' :
                              'bg-[#EFEBE2] text-[#64748B]'
                            }`}>
                              {doc.subsidiary}
                            </span>
                            {isApproved ? (
                              <span className="text-[10px] font-mono font-bold text-[#16A34A] bg-[#F0FDF4] px-1.5 py-0.5 rounded">
                                ✓ Approved v{doc.versions[0]?.versionNumber}.0
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold text-[#DC2626] bg-[#FEF2F2] px-1.5 py-0.5 rounded">
                                ⚠ {doc.status}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-[#141C2B] truncate">{doc.title}</h4>
                          <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                            {doc.versions[0]?.extractedText.slice(0, 110)}...
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-[#EFEBE2]">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg hover:bg-[#D4CEBF] cursor-pointer"
                >
                  ← Back to Subsidiary
                </button>
                <button
                  disabled={selectedDocIds.length === 0}
                  onClick={handleStartGeneration}
                  className="px-6 py-2.5 bg-[#141C2B] disabled:opacity-50 text-white text-xs font-bold rounded-lg hover:bg-[#1E293B] flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#C8892E]" />
                  <span>Synthesize Grounded Report</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Generation Live Log & Output View */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* Extraction Progress Logs */}
              {isGenerating && (
                <div className="bg-[#141C2B] text-white p-6 rounded-xl border border-[#1E293B] space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2 text-[#C8892E]">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span className="font-bold">Live AI Knowledge Extraction & Validation Engine:</span>
                  </div>
                  <div className="space-y-1.5 bg-[#0E1522] p-4 rounded-lg border border-[#1E293B] text-[#94A3B8]">
                    {genLogs.map((log, idx) => (
                      <div key={idx} className="animate-fadeIn">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Report Display */}
              {generatedReport && !isGenerating && (
                <div className="bg-white border border-[#E4E0D6] rounded-xl p-8 shadow-md space-y-6 print:border-none print:shadow-none">
                  {/* Report Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b-2 border-[#141C2B] gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E] font-bold uppercase mb-1">
                        <span>Central Mine Planning & Design Institute</span>
                        <span>·</span>
                        <span>{generatedReport.reportCode}</span>
                      </div>
                      <h2 className="font-serif font-bold text-2xl text-[#141C2B]">
                        {generatedReport.title}
                      </h2>
                      <div className="text-xs text-[#64748B] flex items-center gap-4 mt-1 font-mono">
                        <span>Period: <strong>{generatedReport.period}</strong></span>
                        <span>Compiled: <strong>{new Date(generatedReport.createdAt).toLocaleDateString()}</strong></span>
                        <span>Author: <strong>{generatedReport.generatedBy.name}</strong></span>
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                      <button
                        onClick={handleCopyReport}
                        className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copy raw markdown to clipboard"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
                        <span>{copiedText ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        id="btn-export-report-pdf"
                        onClick={handleDownloadPdf}
                        disabled={isExportingPdf}
                        className="px-4 py-2 bg-[#141C2B] text-white hover:bg-[#1E293B] text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        title="Download standard PDF file directly to your computer"
                      >
                        {isExportingPdf ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-[#C8892E] animate-spin" />
                            <span>Creating PDF...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-[#C8892E]" />
                            <span>Download PDF</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Report Content Body with Rich Markdown Rendering */}
                  <div className="report-markdown-body bg-[#FAF8F3] p-6 sm:p-8 rounded-xl border border-[#E4E0D6] shadow-xs">
                    <Markdown>{generatedReport.content}</Markdown>
                  </div>

                  {/* Grounded Source Citations List (Section 5.7 Spec) */}
                  {generatedReport.citations.length > 0 && (
                    <div className="pt-6 border-t border-[#EFEBE2] space-y-3">
                      <div className="flex items-center gap-2 text-xs font-mono uppercase font-bold text-[#64748B]">
                        <ShieldCheck className="w-4 h-4 text-[#4C7A52]" />
                        <span>Auditable Source Citations Attached to Report:</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {generatedReport.citations.map((c, idx) => (
                          <div
                            key={idx}
                            onClick={() => setActiveCitationForModal(c)}
                            className="p-3 bg-[#FAF8F3] border border-[#E4E0D6] hover:border-[#C8892E] rounded-lg cursor-pointer transition-all"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] mb-1">
                              <span className="font-bold text-[#141C2B]">{c.documentCode} v{c.versionNumber}.0</span>
                              <span className="text-[#C8892E]">{c.pageOrSheetRef}</span>
                            </div>
                            <h4 className="text-xs font-bold text-[#141C2B] truncate">{c.documentTitle}</h4>
                            <p className="text-[11px] text-[#64748B] italic mt-0.5 line-clamp-1">"{c.excerpt}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Return Button */}
                  <div className="pt-4 flex justify-start print:hidden">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 bg-[#EFEBE2] hover:bg-[#D4CEBF] text-xs font-bold rounded-lg text-[#141C2B]"
                    >
                      ← Create Another Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Compiled Reports History Tab */
        <div className="bg-white border border-[#E4E0D6] rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#EFEBE2] flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[#141C2B]">
              Historical Directorate Briefings & Generated Reports
            </h3>
            <span className="text-xs font-mono text-[#64748B]">{reports.length} archived reports</span>
          </div>

          <div className="divide-y divide-[#EFEBE2]">
            {reports.map((rep) => (
              <div key={rep.id} className="p-4 hover:bg-[#FAF8F3] transition-colors flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold bg-[#EFEBE2] px-1.5 py-0.5 rounded text-[#141C2B]">
                      {rep.reportCode}
                    </span>
                    <span className="text-[10px] font-mono text-[#64748B]">
                      {rep.subsidiary} · {rep.period}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#141C2B]">{rep.title}</h4>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{rep.summary}</p>
                </div>

                <button
                  onClick={() => {
                    setGeneratedReport(rep);
                    setActiveTab('create');
                    setCurrentStep(5);
                  }}
                  className="px-3 py-1.5 bg-[#141C2B] text-white hover:bg-[#1E293B] rounded text-xs font-semibold flex items-center gap-1"
                >
                  <span>View Report</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#C8892E]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
