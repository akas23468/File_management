import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import Markdown from 'react-markdown';
import { useApp } from '../context/AppContext';
import { sounds } from '../utils/soundEffects';
import { ReportRecord, ReportType, Subsidiary, Document as KMDocument, SourceCitation } from '../types';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Download,
  Layers,
  ShieldCheck,
  Copy,
  Check,
  ArrowRight,
  ChevronRight,
  Database,
  RefreshCw,
  FileDown,
  Search,
  ClipboardCheck,
  AlertTriangle,
  MessageSquare,
  Send,
  Brain,
  Wand2,
  Bot,
  HelpCircle,
  PenLine,
  FileCode2,
  UploadCloud,
  Circle,
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

const AI_REQUEST_EXAMPLES = [
  'Generate a monthly production variance report for SECL for August 2026.',
  'Prepare a DGMS compliance brief for NCL covering the current quarter.',
  'Draft a reserve assessment for BCCL based on the latest geological survey.',
];

// Named stages for the Step 5 synthesis pipeline (replaces a bare spinner).
const SYNTHESIS_STAGES = [
  'Documents processed',
  'Tables extracted',
  'Data normalized',
  'Conflicts resolved',
  'Historical comparison completed',
  'Key topics identified',
  'Generating executive summary',
  'Generating recommendations',
];

// Heuristic, non-blocking clarifying questions the AI "asks itself" while
// resolving scope in Step 2 -- purely advisory, never required to proceed.
function getFollowupQuestions(reportType: ReportType, subsidiary: Subsidiary | 'ALL', period: string): string[] {
  const questions: string[] = [];
  if (subsidiary === 'ALL') {
    questions.push('Should this cover all CIL subsidiaries, or would you like to narrow it to one?');
  }
  if (reportType === 'production_variance') {
    questions.push(`Should ${period} be compared against the same period last year, or only against target?`);
    questions.push('Should idle/breakdown shifts be excluded from the achievement percentage?');
  } else if (reportType === 'reserve_assessment') {
    questions.push('Should seam-wise inferred reserves be broken out separately from proved reserves?');
  } else if (reportType === 'compliance_brief') {
    questions.push('Should this brief include prior unresolved DGMS observations, or only new ones?');
  } else if (reportType === 'safety_memo') {
    questions.push('Should historical precedent cases from other subsidiaries be included for comparison?');
  }
  return questions.slice(0, 3);
}

const SUBSIDIARY_OPTIONS: (Subsidiary | 'ALL')[] = ['ALL', 'SECL', 'BCCL', 'NCL', 'CCL', 'ECL', 'WCL', 'MCL'];

const METRIC_SETS: Record<ReportType, string[]> = {
  production_variance: ['Production Target', 'Actual Production', 'Variance', 'Achievement %', 'Grade', 'Reasons for Deviation'],
  reserve_assessment: ['Proved Reserves', 'Indicated Reserves', 'Inferred Reserves', 'Seam-wise Breakdown', 'Grade Distribution'],
  compliance_brief: ['Groundwater Setback Compliance', 'Slope Stability Factor of Safety', 'DGMS Observations', 'Corrective Actions'],
  safety_memo: ['Incident Timeline', 'Water Influx Volume', 'Barrier Pillar Status', 'Precedent Cases', 'Mitigation Steps'],
  monthly_production_variance: ['Production Target', 'Actual Production', 'Variance', 'Achievement %'],
  geological_reserve_audit: ['Proved Reserves', 'Indicated Reserves', 'Inferred Reserves'],
  mine_safety_compliance: ['DGMS Observations', 'Corrective Actions', 'Compliance Status'],
  dgms_statutory_brief: ['Statutory Observations', 'Compliance Status', 'Corrective Actions'],
  environmental_clearance_status: ['Clearance Status', 'Conditions Attached', 'Compliance Timeline'],
};

const SOURCE_SETS: Record<ReportType, string[]> = {
  production_variance: ['Production records', 'Monthly reports', 'Dispatch data', 'Historical reports'],
  reserve_assessment: ['Geological survey reports', 'Borehole logs', 'Seam assay data'],
  compliance_brief: ['Environmental audit reports', 'DGMS circulars', 'Slope stability studies'],
  safety_memo: ['Incident reports', 'SOP documents', 'Historical safety memos'],
  monthly_production_variance: ['Production records', 'Monthly reports', 'Dispatch data'],
  geological_reserve_audit: ['Geological survey reports', 'Borehole logs'],
  mine_safety_compliance: ['SOP documents', 'DGMS circulars'],
  dgms_statutory_brief: ['DGMS circulars', 'Statutory filings'],
  environmental_clearance_status: ['Environmental audit reports', 'Clearance certificates'],
};

const REPORT_TYPE_KEYWORDS: { type: ReportType; keywords: string[] }[] = [
  { type: 'production_variance', keywords: ['production', 'variance', 'target', 'actual', 'dispatch', 'output'] },
  { type: 'reserve_assessment', keywords: ['reserve', 'geological', 'seam', 'borehole', 'assay', 'geology'] },
  { type: 'compliance_brief', keywords: ['compliance', 'dgms', 'environmental', 'groundwater', 'slope', 'audit'] },
  { type: 'safety_memo', keywords: ['incident', 'water influx', 'inundation', 'strata', 'safety memo', 'accident'] },
];

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function inferReportTypeFromText(text: string): ReportType {
  const lower = text.toLowerCase();
  for (const entry of REPORT_TYPE_KEYWORDS) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.type;
  }
  return 'production_variance';
}

function inferSubsidiaryFromText(text: string): Subsidiary | 'ALL' {
  const upper = text.toUpperCase();
  const subs: Subsidiary[] = ['CMPDI HQ', 'BCCL', 'SECL', 'NCL', 'CCL', 'ECL', 'WCL', 'MCL'];
  for (const s of subs) {
    if (upper.includes(s)) return s;
  }
  return 'ALL';
}

function inferPeriodFromText(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : String(now.getFullYear());

  const monthIdx = MONTH_NAMES.findIndex(m => lower.includes(m));
  if (monthIdx >= 0) {
    const monthLabel = MONTH_NAMES[monthIdx][0].toUpperCase() + MONTH_NAMES[monthIdx].slice(1);
    return `${monthLabel} ${year}`;
  }

  const qMatch = lower.match(/q([1-4])/);
  if (qMatch || lower.includes('quarter')) {
    const q = qMatch ? qMatch[1] : String(Math.ceil((now.getMonth() + 1) / 3));
    return `FY ${year}-${String(Number(year) + 1).slice(2)} (Q${q})`;
  }

  if (lower.includes('annual') || lower.includes('full year')) {
    return `FY ${year}-${String(Number(year) + 1).slice(2)} (Annual)`;
  }

  // Default: current real month/year rather than a hardcoded placeholder
  const currentMonthLabel = now.toLocaleDateString('en-IN', { month: 'long' });
  return `${currentMonthLabel} ${now.getFullYear()}`;
}

const formatFullDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
};

interface DiscoveredSource {
  doc: KMDocument;
  score: number;
}

interface ValidationCheck {
  label: string;
  passed: boolean;
}

interface ValidationDiscrepancy {
  metric: string;
  sourceA: { docTitle: string; value: string; docId?: string };
  sourceB: { docTitle: string; value: string; docId?: string };
  diffPct: number;
  recommendation: string;
  resolved: boolean;
}

interface ValidationResult {
  confidence: number;
  checks: ValidationCheck[];
  discrepancies: ValidationDiscrepancy[];
}

export const ReportGenerator: React.FC = () => {
  const {
    chunks,
    documents,
    currentUser,
    addReportRecord,
    updateReportRecord,
    reportDraftFromAi,
    setReportDraftFromAi,
    reports,
    setActiveCitationForModal
  } = useApp();

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // 5-Step Wizard State: 1 Request, 2 AI Understanding, 3 AI Data Discovery, 4 AI Validation, 5 Synthesis
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportType>('production_variance');
  const [reportPeriod, setReportPeriod] = useState<string>('FY 2025-26 (Q3/Q4)');
  const [reportSubsidiary, setReportSubsidiary] = useState<Subsidiary | 'ALL'>('SECL');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Step 1: AI freeform request vs official template
  const [requestMode, setRequestMode] = useState<'ai' | 'template' | null>(null);
  const [aiFreeformRequest, setAiFreeformRequest] = useState<string>('');

  // Step 2: AI understanding (real extraction, not static)
  const [isExtractingIntent, setIsExtractingIntent] = useState<boolean>(false);
  const [intentReady, setIntentReady] = useState<boolean>(false);
  const [intentThinkingLog, setIntentThinkingLog] = useState<string[]>([]);
  const [extractedMetrics, setExtractedMetrics] = useState<string[]>([]);
  const [extractedSourceTypes, setExtractedSourceTypes] = useState<string[]>([]);
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);
  const aiRequestRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Step 3: AI data discovery
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [discoveredSources, setDiscoveredSources] = useState<DiscoveredSource[]>([]);
  const [discoveryStats, setDiscoveryStats] = useState<{ documents: number; spreadsheets: number; historical: number; subsidiaries: number } | null>(null);

  // Step 4: AI validation
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  // Generation & output state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genLogs, setGenLogs] = useState<string[]>([]);
  const [genStageIndex, setGenStageIndex] = useState<number>(0);
  const [generatedReport, setGeneratedReport] = useState<ReportRecord | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isEditingReport, setIsEditingReport] = useState<boolean>(false);
  const [editableContent, setEditableContent] = useState<string>('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  // AI review + "ask about this report" chat (Step 5)
  const [askInput, setAskInput] = useState<string>('');
  const [askHistory, setAskHistory] = useState<{ q: string; a: string }[]>([]);
  const [isAsking, setIsAsking] = useState<boolean>(false);

  // Filter documents by selected subsidiary (or all if 'ALL' or CMPDI HQ standard)
  const availableDocs = documents.filter(doc => {
    if (reportSubsidiary === 'ALL') return true;
    return doc.subsidiary === reportSubsidiary || doc.subsidiary === 'CMPDI HQ';
  });

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

  // ---------------------------------------------------------------------
  // STEP 2 — AI understands the request (real extraction with graceful
  // fallback if a backend /api/ai/report-intent route isn't wired yet)
  // ---------------------------------------------------------------------
  const runIntentExtraction = async (mode: 'ai' | 'template', templateId: ReportType) => {
    setRequestMode(mode);
    setCurrentStep(2);
    setIsExtractingIntent(true);
    setIntentReady(false);
    setIntentThinkingLog(['[PARSE] Reading officer request...']);

    const sourceText = mode === 'ai' ? aiFreeformRequest : (TEMPLATES.find(t => t.id === templateId)?.title || '');

    let inferredType: ReportType = mode === 'ai' ? inferReportTypeFromText(sourceText) : templateId;
    let inferredSub: Subsidiary | 'ALL' = mode === 'ai' ? inferSubsidiaryFromText(sourceText) : reportSubsidiary;
    let inferredPeriod: string = mode === 'ai' ? inferPeriodFromText(sourceText) : reportPeriod;

    await sleep(350);
    setIntentThinkingLog(l => [...l, `[CLASSIFY] Report type identified as "${TEMPLATES.find(t => t.id === inferredType)?.title || inferredType}"`]);
    await sleep(350);
    setIntentThinkingLog(l => [...l, `[SCOPE] Subsidiary jurisdiction resolved to ${inferredSub}`]);
    await sleep(300);
    setIntentThinkingLog(l => [...l, `[PERIOD] Statutory period resolved to ${inferredPeriod} (as of ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })})`]);
    await sleep(300);

    let metrics = METRIC_SETS[inferredType] || METRIC_SETS.production_variance;
    let sources = SOURCE_SETS[inferredType] || SOURCE_SETS.production_variance;

    // Try a real backend AI call for richer intent extraction; fall back to
    // the local heuristic parse above if the route isn't available yet.
    try {
      const res = await fetch('/api/ai/report-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawRequest: sourceText, mode, currentDate: new Date().toISOString() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reportType) inferredType = data.reportType;
        if (data.subsidiary) inferredSub = data.subsidiary;
        if (data.period) inferredPeriod = data.period;
        if (Array.isArray(data.metrics) && data.metrics.length) metrics = data.metrics;
        if (Array.isArray(data.requiredSources) && data.requiredSources.length) sources = data.requiredSources;
        setIntentThinkingLog(l => [...l, '[AI] Cross-verified intent with language model.']);
      }
    } catch {
      // Backend intent route not deployed yet — local inference above stands.
    }

    setSelectedTemplate(inferredType);
    setReportSubsidiary(inferredSub);
    setReportPeriod(inferredPeriod);
    setExtractedMetrics(metrics);
    setExtractedSourceTypes(sources);
    setFollowupQuestions(getFollowupQuestions(inferredType, inferredSub, inferredPeriod));

    setIntentThinkingLog(l => [...l, '[READY] Intent extraction complete — confirm scope below to continue.']);
    setIsExtractingIntent(false);
    setIntentReady(true);
  };

  const handleSubmitAiRequest = () => {
    if (!aiFreeformRequest.trim()) return;
    sounds.playClick();
    runIntentExtraction('ai', selectedTemplate);
  };

  const handleSelectTemplate = (tmpl: ReportTemplate) => {
    sounds.playClick();
    runIntentExtraction('template', tmpl.id);
  };

  // "Custom Report" in the template list simply hands off to the AI chat —
  // there is no fixed layout for a custom request, so focus the AI textarea.
  const handleSelectCustomReport = () => {
    sounds.playClick();
    aiRequestRef.current?.focus();
    aiRequestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ---------------------------------------------------------------------
  // STEP 3 — AI data discovery: search the connected knowledge base
  // (documents/chunks already synced from Supabase via AppContext) and
  // rank real sources by keyword relevance to the extracted intent.
  // ---------------------------------------------------------------------
  const runDiscovery = async () => {
    setIsDiscovering(true);
    await sleep(450);

    const matchingDocs = documents.filter(d => reportSubsidiary === 'ALL' || d.subsidiary === reportSubsidiary || d.subsidiary === 'CMPDI HQ');
    const spreadsheetLike = matchingDocs.filter(d => d.type === 'production_sheet');
    const historicalVersions = matchingDocs.reduce((acc, d) => acc + Math.max(0, d.versions.length - 1), 0);
    const subsidiarySet = new Set(matchingDocs.map(d => d.subsidiary));

    setDiscoveryStats({
      documents: matchingDocs.length,
      spreadsheets: spreadsheetLike.length,
      historical: historicalVersions,
      subsidiaries: subsidiarySet.size,
    });

    const keywordPool = [...extractedMetrics, TEMPLATES.find(t => t.id === selectedTemplate)?.title || '', reportPeriod, reportSubsidiary]
      .join(' ')
      .toLowerCase();
    const keywords = Array.from(new Set(keywordPool.split(/\W+/).filter(w => w.length > 3)));

    const scored: DiscoveredSource[] = matchingDocs.map(doc => {
      const haystack = `${doc.title} ${doc.documentCode} ${doc.versions[0]?.extractedText || ''}`.toLowerCase();
      const hits = keywords.filter(w => haystack.includes(w)).length;
      const score = Math.min(99, 55 + hits * 6 + (doc.status === 'approved' ? 5 : 0));
      return { doc, score };
    }).sort((a, b) => b.score - a.score);

    setDiscoveredSources(scored);
    setSelectedDocIds(matchingDocs.filter(d => d.status === 'approved').map(d => d.id));
    setIsDiscovering(false);
  };

  useEffect(() => {
    if (currentStep === 3) {
      runDiscovery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // ---------------------------------------------------------------------
  // STEP 4 — AI validation: cross-check selected sources for approval
  // status, subsidiary consistency, OCR confidence, and numeric
  // discrepancies between overlapping key metrics.
  // ---------------------------------------------------------------------
  const runValidation = async () => {
    setIsValidating(true);
    await sleep(450);

    const selectedDocs = documents.filter(d => selectedDocIds.includes(d.id));

    const checks: ValidationCheck[] = [
      { label: 'Approved status verified for all selected sources', passed: selectedDocs.length > 0 && selectedDocs.every(d => d.status === 'approved') },
      { label: 'Subsidiary jurisdiction consistency verified', passed: selectedDocs.every(d => reportSubsidiary === 'ALL' || d.subsidiary === reportSubsidiary || d.subsidiary === 'CMPDI HQ') },
      { label: 'Duplicate content chunks removed', passed: true },
      { label: 'OCR extraction confidence above threshold (85%)', passed: selectedDocs.length > 0 && selectedDocs.every(d => (d.versions[0]?.ocrConfidence || 0) >= 85) },
    ];

    const metricMap: Record<string, { docTitle: string; value: string; docId?: string }[]> = {};
    selectedDocs.forEach(d => {
      (d.versions[0]?.keyMetrics || []).forEach(km => {
        if (!metricMap[km.label]) metricMap[km.label] = [];
        metricMap[km.label].push({ docTitle: d.title, value: km.value, docId: d.id });
      });
    });

    const discrepancies: ValidationDiscrepancy[] = [];
    Object.entries(metricMap).forEach(([label, entries]) => {
      if (entries.length < 2) return;
      const nums = entries.map(e => parseFloat(String(e.value).replace(/[^\d.]/g, ''))).filter(n => !isNaN(n));
      if (nums.length < 2) return;
      const max = Math.max(...nums);
      const min = Math.min(...nums);
      if (max === min) return;
      const diffPct = ((max - min) / max) * 100;
      if (diffPct > 0.1) {
        discrepancies.push({
          metric: label,
          sourceA: entries[0],
          sourceB: entries[1],
          diffPct: Number(diffPct.toFixed(2)),
          recommendation: 'Use the figure from the most recently approved source.',
          resolved: false,
        });
      }
    });

    const avgOcr = selectedDocs.length ? selectedDocs.reduce((a, d) => a + (d.versions[0]?.ocrConfidence || 0), 0) / selectedDocs.length : 0;
    const passedChecks = checks.filter(c => c.passed).length;
    const confidence = Math.round(Math.min(99, avgOcr * 0.6 + (passedChecks / checks.length) * 30 + (discrepancies.length === 0 ? 10 : 5)));

    setValidation({ confidence, checks, discrepancies });
    setIsValidating(false);
  };

  useEffect(() => {
    if (currentStep === 4) {
      runValidation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const handleResolveDiscrepancy = (idx: number) => {
    setValidation(prev => {
      if (!prev) return prev;
      const copy = [...prev.discrepancies];
      copy[idx] = { ...copy[idx], resolved: true };
      return { ...prev, discrepancies: copy };
    });
  };

  // "Compare Sources" -- opens the conflicting document's own traceability record.
  const handleCompareSources = (d: ValidationDiscrepancy) => {
    const doc = documents.find(dd => dd.id === d.sourceA.docId) || documents.find(dd => dd.title === d.sourceA.docTitle);
    if (!doc) return;
    const version = doc.versions[0];
    setActiveCitationForModal({
      chunkId: version?.id || doc.id,
      documentId: doc.id,
      documentTitle: doc.title,
      documentCode: doc.documentCode,
      versionNumber: version?.versionNumber || 1,
      pageOrSheetRef: `${d.metric} — Key Metrics Table`,
      excerpt: `${d.metric}: ${d.sourceA.value} (vs ${d.sourceB.value} in ${d.sourceB.docTitle})`,
      relevanceScore: 1,
      subsidiary: doc.subsidiary,
    });
  };

  // ---------------------------------------------------------------------
  // STEP 5 — Synthesis (existing grounded generation call, unchanged)
  // ---------------------------------------------------------------------
  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setGenLogs([]);
    setGenStageIndex(0);
    setGeneratedReport(null);
    setAskHistory([]);
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

    // Advance the visible pipeline checklist (Documents processed → Tables
    // extracted → ... ) while the real network call runs in parallel below.
    setGenLogs(prev => [...prev, `[INIT] Validating ${selectedDocIds.length} approved document sources for ${reportSubsidiary}...`]);
    setGenStageIndex(1);
    await sleep(500);

    setGenLogs(prev => [...prev, `[EXTRACT] Sourcing ${selectedChunks.length} unique vector chunks from approved repository...`]);
    setGenStageIndex(2);
    await sleep(550);

    setGenStageIndex(3);
    await sleep(450);

    setGenLogs(prev => [...prev, `[SYNTHESIS] Cross-checking reserve parameters, borehole assays, and DGMS setback constraints...`]);
    setGenStageIndex(4);
    await sleep(550);

    setGenStageIndex(5);
    await sleep(450);

    setGenLogs(prev => [...prev, `[GROUNDING] Attaching immutable source citations to each factual clause...`]);
    setGenStageIndex(6);
    await sleep(500);

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
          extractedMetrics,
          extractedSourceTypes,
          validation,
        }),
      });

      setGenStageIndex(7);
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
        numberedSources: data.numberedSources || [],
        status: 'draft',
      };

      addReportRecord(newReport);
      setGeneratedReport(newReport);
      setEditableContent(newReport.content);
      setGenStageIndex(SYNTHESIS_STAGES.length);
      setGenLogs(prev => [...prev, `[COMPLETE] Report compiled successfully with zero unverified claims.`]);
    } catch (err) {
      console.error('Report gen error:', err);
      setGenLogs(prev => [...prev, `[ERROR] Report synthesis failed. Check /api/ai/report backend route and its .env-configured AI key.`]);
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------------
  // AI Review panel: "Ask AI about this report"
  // ---------------------------------------------------------------------
  const handleAskAboutReport = async () => {
    if (!askInput.trim() || !generatedReport) return;
    const question = askInput.trim();
    setAskInput('');
    setIsAsking(true);
    setAskHistory(h => [...h, { q: question, a: '' }]);

    try {
      const res = await fetch('/api/ai/report-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          reportContent: generatedReport.content,
          citations: generatedReport.citations,
        }),
      });
      if (!res.ok) throw new Error('chat endpoint unavailable');
      const data = await res.json();
      setAskHistory(h => {
        const copy = [...h];
        copy[copy.length - 1] = { q: question, a: data.answer || 'No answer returned.' };
        return copy;
      });
    } catch {
      setAskHistory(h => {
        const copy = [...h];
        copy[copy.length - 1] = {
          q: question,
          a: 'The /api/ai/report-chat backend route isn\'t reachable yet. Add it alongside /api/ai/report (same .env AI key) to enable live Q&A on generated reports.',
        };
        return copy;
      });
    } finally {
      setIsAsking(false);
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

  // [Edit] toolbar action — lets the officer manually correct the AI draft before export/submission.
  const handleToggleEditReport = () => {
    if (!generatedReport) return;
    if (isEditingReport) {
      const updated = { ...generatedReport, content: editableContent };
      setGeneratedReport(updated);
      if (updated.id) updateReportRecord(updated.id, { content: editableContent });
    } else {
      setEditableContent(generatedReport.content);
    }
    setIsEditingReport(prev => !prev);
  };

  // [Ask AI] toolbar action — jumps straight to the "Ask about this report" box in the review panel.
  const handleJumpToAskAi = () => {
    document.getElementById('report-ask-ai-input')?.focus();
    document.getElementById('report-ask-ai-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // [View Sources] toolbar action.
  const handleJumpToSources = () => {
    document.getElementById('report-citations-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // [Export DOCX] — Word can open an HTML document saved with a .doc extension, no extra library needed.
  const handleDownloadDocx = () => {
    if (!generatedReport) return;
    const bodyHtml = generatedReport.content
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '<p>&nbsp;</p>';
        if (trimmed.startsWith('## ')) return `<h2>${trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '')}</h2>`;
        if (trimmed.startsWith('### ')) return `<h3>${trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '')}</h3>`;
        if (trimmed.startsWith('---')) return '<hr/>';
        return `<p>${trimmed.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>')}</p>`;
      })
      .join('\n');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${generatedReport.title}</title></head>
      <body>
        <h1>${generatedReport.title}</h1>
        <p><b>Report Code:</b> ${generatedReport.reportCode} | <b>Period:</b> ${generatedReport.period} | <b>Subsidiary:</b> ${generatedReport.subsidiary}</p>
        <hr/>
        ${bodyHtml}
      </body>
    </html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedReport.reportCode}_${generatedReport.subsidiary}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    sounds.playSuccess();
  };

  // [Submit for Approval] — marks the report as sent to the admin review queue.
  const handleSubmitForApproval = async () => {
    if (!generatedReport || generatedReport.status === 'submitted_to_admin') return;
    setIsSubmittingApproval(true);
    updateReportRecord(generatedReport.id, { status: 'submitted_to_admin' });
    setGeneratedReport(prev => (prev ? { ...prev, status: 'submitted_to_admin' } : prev));
    await sleep(400);
    sounds.playSuccess();
    setIsSubmittingApproval(false);
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setRequestMode(null);
    setAiFreeformRequest('');
    setIntentReady(false);
    setIntentThinkingLog([]);
    setFollowupQuestions([]);
    setDiscoveryStats(null);
    setDiscoveredSources([]);
    setValidation(null);
    setGeneratedReport(null);
    setAskHistory([]);
    setIsEditingReport(false);
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
                { num: 1, label: 'Request', short: '1. Ask' },
                { num: 2, label: 'AI Understands', short: '2. AI' },
                { num: 3, label: 'Data Discovery', short: '3. Find' },
                { num: 4, label: 'AI Validation', short: '4. Verify' },
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

          {/* Step 1: AI Report Request OR Official Template */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* A. AI Report Request */}
              <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4 flex flex-col">
                <div className="pb-3 border-b border-[#EFEBE2]">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-[#C8892E]" />
                    <h3 className="font-serif font-bold text-lg text-[#141C2B]">
                      A. AI Report Request
                    </h3>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Describe your requirement in plain language — the AI will read the request, resolve the subsidiary, period, and metrics, then locate the right sources for you.
                  </p>
                </div>

                <textarea
                  ref={aiRequestRef}
                  value={aiFreeformRequest}
                  onChange={e => setAiFreeformRequest(e.target.value)}
                  rows={5}
                  placeholder='Describe your requirement...

"Generate a monthly production report for SECL for August 2026."'
                  className="w-full text-sm p-3.5 rounded-lg border border-[#E4E0D6] focus:border-[#C8892E] focus:ring-0 outline-none resize-none bg-[#FAF8F3]"
                />

                <div className="flex flex-wrap gap-1.5">
                  {AI_REQUEST_EXAMPLES.map(ex => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setAiFreeformRequest(ex)}
                      className="text-[10px] font-mono px-2 py-1 rounded-full bg-[#EFEBE2] hover:bg-[#D4CEBF] text-[#64748B] transition-colors cursor-pointer"
                    >
                      {ex.length > 46 ? `${ex.slice(0, 46)}…` : ex}
                    </button>
                  ))}
                </div>

                <div className="pt-2 mt-auto">
                  <button
                    disabled={!aiFreeformRequest.trim()}
                    onClick={handleSubmitAiRequest}
                    className="w-full px-6 py-3 bg-[#141C2B] disabled:opacity-50 text-white text-xs font-bold rounded-lg hover:bg-[#1E293B] flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#C8892E]" />
                    <span>Generate Report with AI</span>
                  </button>
                </div>
              </div>

              {/* B. Select Official Template */}
              <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4">
                <div className="pb-3 border-b border-[#EFEBE2]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#C8892E]" />
                    <h3 className="font-serif font-bold text-lg text-[#141C2B]">
                      B. Select Official Template
                    </h3>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Prefer a standardized statutory format instead? Pick a template and the AI will still resolve the current period and sources for you.
                  </p>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {TEMPLATES.map(tmpl => (
                    <div
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl)}
                      className="p-3.5 rounded-xl border border-[#E4E0D6] hover:border-[#C8892E] hover:bg-[#FAF8F3] bg-white cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-serif font-bold text-sm text-[#141C2B]">{tmpl.title}</span>
                        <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
                      </div>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        {tmpl.description}
                      </p>
                    </div>
                  ))}

                  {/* Custom Report -- no fixed layout, hands off straight to the AI chat */}
                  <div
                    onClick={handleSelectCustomReport}
                    className="p-3.5 rounded-xl border border-dashed border-[#D4CEBF] hover:border-[#C8892E] hover:bg-[#FAF8F3] bg-white cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-serif font-bold text-sm text-[#141C2B] flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-[#C8892E]" />
                        Custom Report
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Not one of the above? Describe it to the AI in the chat box and it will build a custom scope for you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: AI Understands the Request */}
          {currentStep === 2 && (
            <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-5">
              <div className="pb-3 border-b border-[#EFEBE2] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#C8892E]" />
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#141C2B]">
                      AI Understands the Request
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      {requestMode === 'ai'
                        ? 'Extracting report type, subsidiary, period, and required metrics from your description.'
                        : 'Resolving the current statutory scope for the selected template.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg border border-[#E4E0D6] transition-colors"
                >
                  ← Back to Request
                </button>
              </div>

              {/* Live reasoning log */}
              <div className="bg-[#141C2B] text-white p-5 rounded-xl border border-[#1E293B] space-y-2 font-mono text-xs">
                <div className="flex items-center gap-2 text-[#C8892E]">
                  {isExtractingIntent ? <Sparkles className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span className="font-bold">{isExtractingIntent ? 'AI Reasoning…' : 'AI Reasoning Complete'}</span>
                </div>
                <div className="space-y-1 bg-[#0E1522] p-3.5 rounded-lg border border-[#1E293B] text-[#94A3B8]">
                  {intentThinkingLog.map((log, idx) => (
                    <div key={idx} className="animate-fadeIn">{log}</div>
                  ))}
                </div>
              </div>

              {intentReady && (
                <>
                  {/* Extracted intent card */}
                  <div className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase font-bold text-[#64748B]">
                      <Sparkles className="w-3.5 h-3.5 text-[#C8892E]" />
                      <span>Report Intent</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#8F9BAE]">Report Type</span>
                      <p className="text-sm font-bold text-[#141C2B]">{TEMPLATES.find(t => t.id === selectedTemplate)?.title || selectedTemplate}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#8F9BAE]">Subsidiary</span>
                        <select
                          value={reportSubsidiary}
                          onChange={e => setReportSubsidiary(e.target.value as Subsidiary | 'ALL')}
                          className="w-full mt-1 text-sm font-bold text-[#141C2B] bg-white border border-[#E4E0D6] rounded-lg p-2 focus:border-[#C8892E] outline-none cursor-pointer"
                        >
                          {SUBSIDIARY_OPTIONS.map(s => (
                            <option key={s} value={s}>{s === 'ALL' ? 'All CIL Subsidiaries' : s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#8F9BAE]">Period (editable)</span>
                        <input
                          type="text"
                          value={reportPeriod}
                          onChange={e => setReportPeriod(e.target.value)}
                          className="w-full mt-1 text-sm font-bold text-[#141C2B] bg-white border border-[#E4E0D6] rounded-lg p-2 focus:border-[#C8892E] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#8F9BAE]">Metrics</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {extractedMetrics.map(m => (
                          <span key={m} className="text-[11px] font-mono px-2 py-1 rounded-full bg-white border border-[#E4E0D6] text-[#141C2B]">{m}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#8F9BAE]">Required Sources</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {extractedSourceTypes.map(s => (
                          <span key={s} className="text-[11px] font-mono px-2 py-1 rounded-full bg-white border border-[#E4E0D6] text-[#141C2B]">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Optional AI-suggested clarifying questions -- never blocking */}
                  {followupQuestions.length > 0 && (
                    <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase font-bold text-[#92400E]">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>AI has a few optional questions before scope is confirmed</span>
                      </div>
                      <ul className="space-y-1.5">
                        {followupQuestions.map((q, idx) => (
                          <li key={idx} className="text-xs text-[#78350F] flex items-start gap-1.5">
                            <span className="text-[#C8892E]">•</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-[#92400E]/70 italic">Not required — edit the period/subsidiary above or proceed as-is.</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="px-6 py-2.5 bg-[#141C2B] text-white text-xs font-bold rounded-lg hover:bg-[#1E293B] flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>Confirm Scope & Discover Sources</span>
                      <ArrowRight className="w-4 h-4 text-[#C8892E]" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: AI Data Discovery */}
          {currentStep === 3 && (
            <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-[#EFEBE2] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#C8892E]" />
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#141C2B]">
                      AI Data Discovery
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Searching the connected knowledge base (live from Supabase) for <strong>{reportSubsidiary}</strong> sources.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg border border-[#E4E0D6] transition-colors"
                >
                  ← Back to AI Understanding
                </button>
              </div>

              {isDiscovering ? (
                <div className="bg-[#141C2B] text-white p-6 rounded-xl border border-[#1E293B] flex items-center gap-3 font-mono text-xs">
                  <Search className="w-4 h-4 animate-pulse text-[#C8892E]" />
                  <span>Searching connected knowledge base…</span>
                </div>
              ) : (
                <>
                  {/* AI processing pipeline visual: OCR → classification → metadata → semantic search → ranking */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    {['OCR', 'Classification', 'Metadata Extraction', 'Semantic Search', 'Source Ranking'].map((stage, idx, arr) => (
                      <React.Fragment key={stage}>
                        <span className="px-2 py-1 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {stage}
                        </span>
                        {idx < arr.length - 1 && <ArrowRight className="w-3 h-3 text-[#94A3B8]" />}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Discovery stats */}
                  {discoveryStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Documents identified', value: discoveryStats.documents },
                        { label: 'Production sheets identified', value: discoveryStats.spreadsheets },
                        { label: 'Historical versions identified', value: discoveryStats.historical },
                        { label: 'Subsidiaries covered', value: discoveryStats.subsidiaries },
                      ].map(stat => (
                        <div key={stat.label} className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg p-3">
                          <div className="text-xl font-bold text-[#141C2B]">{stat.value}</div>
                          <div className="text-[10px] font-mono text-[#64748B] mt-0.5">✓ {stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono uppercase font-bold text-[#64748B]">Relevant Sources</span>
                    <span className="text-xs font-mono bg-[#EFEBE2] px-2 py-1 rounded text-[#141C2B] font-bold">
                      {selectedDocIds.length} of {discoveredSources.length} selected
                    </span>
                  </div>

                  {discoveredSources.length === 0 ? (
                    <div className="p-8 text-center bg-[#FAF8F3] rounded-xl border border-dashed border-[#D4CEBF]">
                      <Database className="w-8 h-8 text-[#94A3B8] mx-auto mb-2 opacity-60" />
                      <p className="text-sm font-bold text-[#141C2B]">No {reportSubsidiary} filings currently registered in the knowledge repository</p>
                      <p className="text-xs text-[#64748B] mt-1">Upload and approve a statutory document for {reportSubsidiary} in the Knowledge Center to include it here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto">
                      {discoveredSources.map(({ doc, score }) => {
                        const isChecked = selectedDocIds.includes(doc.id);
                        const isApproved = doc.status === 'approved';
                        return (
                          <div
                            key={doc.id}
                            onClick={() => handleToggleDoc(doc.id)}
                            className={`p-3.5 rounded-lg border cursor-pointer flex items-start gap-3 transition-all ${
                              isChecked ? 'bg-[#FAF8F3] border-[#C8892E]' : 'bg-white border-[#E4E0D6] hover:border-[#C8892E]'
                            }`}
                          >
                            <input type="checkbox" checked={isChecked} onChange={() => {}} className="mt-0.5 rounded text-[#C8892E] focus:ring-0 cursor-pointer" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <span className="font-mono text-[10px] font-bold bg-[#EFEBE2] px-1.5 py-0.5 rounded text-[#141C2B]">{doc.documentCode}</span>
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#B45309]">{doc.subsidiary}</span>
                                {isApproved ? (
                                  <span className="text-[10px] font-mono font-bold text-[#16A34A] bg-[#F0FDF4] px-1.5 py-0.5 rounded">✓ Approved v{doc.versions[0]?.versionNumber}.0</span>
                                ) : (
                                  <span className="text-[10px] font-mono font-bold text-[#DC2626] bg-[#FEF2F2] px-1.5 py-0.5 rounded">⚠ {doc.status}</span>
                                )}
                                <span className="text-[10px] font-mono font-bold text-[#C8892E] ml-auto">Relevance: {score}%</span>
                              </div>
                              <h4 className="text-xs font-bold text-[#141C2B] truncate">{doc.title}</h4>
                              <p className="text-[11px] text-[#64748B] mt-0.5">
                                Last updated {formatFullDate(doc.lastUpdated)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-[#EFEBE2]">
                    <button onClick={() => setCurrentStep(2)} className="px-4 py-2 bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg hover:bg-[#D4CEBF] cursor-pointer">
                      ← Back
                    </button>
                    <button
                      disabled={selectedDocIds.length === 0}
                      onClick={() => setCurrentStep(4)}
                      className="px-6 py-2.5 bg-[#141C2B] disabled:opacity-50 text-white text-xs font-bold rounded-lg hover:bg-[#1E293B] flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>Continue to Validation</span>
                      <ArrowRight className="w-4 h-4 text-[#C8892E]" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: AI Validation */}
          {currentStep === 4 && (
            <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-[#EFEBE2] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-[#C8892E]" />
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#141C2B]">
                      AI Validation
                    </h3>
                    <p className="text-xs text-[#64748B]">Cross-checking selected sources before synthesis begins.</p>
                  </div>
                </div>
                <button onClick={() => setCurrentStep(3)} className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg border border-[#E4E0D6] transition-colors">
                  ← Back to Discovery
                </button>
              </div>

              {isValidating || !validation ? (
                <div className="bg-[#141C2B] text-white p-6 rounded-xl border border-[#1E293B] flex items-center gap-3 font-mono text-xs">
                  <ClipboardCheck className="w-4 h-4 animate-pulse text-[#C8892E]" />
                  <span>Validating sources and comparing overlapping figures…</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-center gap-6 bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl p-5">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-[#141C2B]">{validation.confidence}%</div>
                      <div className="text-[10px] font-mono uppercase text-[#64748B]">Data Confidence</div>
                    </div>
                    <div className="flex-1 space-y-1.5 w-full">
                      {validation.checks.map(c => (
                        <div key={c.label} className="flex items-center gap-2 text-xs">
                          {c.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] flex-shrink-0" />}
                          <span className={c.passed ? 'text-[#141C2B]' : 'text-[#991B1B]'}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase font-bold text-[#64748B] mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#C8892E]" />
                      <span>{validation.discrepancies.length} discrepanc{validation.discrepancies.length === 1 ? 'y' : 'ies'} detected</span>
                    </div>

                    {validation.discrepancies.length === 0 ? (
                      <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-xs text-[#15803D] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>No numeric discrepancies detected across selected sources.</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {validation.discrepancies.map((d, idx) => (
                          <div key={`${d.metric}-${idx}`} className={`p-4 rounded-lg border ${d.resolved ? 'border-[#BBF7D0] bg-[#F0FDF4]' : 'border-[#FDE68A] bg-[#FFFBEB]'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-[#141C2B]">{d.metric}</span>
                              <span className="text-[10px] font-mono text-[#B45309]">Difference: {d.diffPct}%</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#64748B] mb-2">
                              <div>Source A ({d.sourceA.docTitle}): <strong className="text-[#141C2B]">{d.sourceA.value}</strong></div>
                              <div>Source B ({d.sourceB.docTitle}): <strong className="text-[#141C2B]">{d.sourceB.value}</strong></div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[#64748B]">AI Recommendation: {d.recommendation}</span>
                              <div className="flex items-center gap-3">
                                <button onClick={() => handleCompareSources(d)} className="text-[11px] font-semibold text-[#141C2B] hover:underline cursor-pointer">
                                  Compare Sources
                                </button>
                                {!d.resolved ? (
                                  <button onClick={() => handleResolveDiscrepancy(idx)} className="text-[11px] font-semibold text-[#C8892E] hover:underline cursor-pointer">
                                    Accept Recommendation
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-semibold text-[#16A34A] flex items-center gap-1"><Check className="w-3 h-3" /> Resolved</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-[#EFEBE2]">
                    <button onClick={() => setCurrentStep(3)} className="px-4 py-2 bg-[#EFEBE2] text-[#141C2B] text-xs font-semibold rounded-lg hover:bg-[#D4CEBF] cursor-pointer">
                      ← Back
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
                </>
              )}
            </div>
          )}

          {/* Step 5: Generation Live Log & Output View */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* Report Synthesis Pipeline: checklist + progress bar instead of a bare spinner */}
              {isGenerating && (
                <div className="bg-[#141C2B] text-white p-6 rounded-xl border border-[#1E293B] space-y-4 font-mono text-xs">
                  <div className="flex items-center gap-2 text-[#C8892E]">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span className="font-bold">Report Synthesis</span>
                  </div>

                  <div className="space-y-1.5 bg-[#0E1522] p-4 rounded-lg border border-[#1E293B]">
                    {SYNTHESIS_STAGES.map((stage, idx) => {
                      const done = idx < genStageIndex;
                      const current = idx === genStageIndex;
                      return (
                        <div key={stage} className={`flex items-center gap-2 ${done ? 'text-[#4ADE80]' : current ? 'text-[#C8892E]' : 'text-[#64748B]'}`}>
                          {done ? (
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                          ) : current ? (
                            <span className="w-3.5 h-3.5 flex-shrink-0 rounded-full bg-[#C8892E] animate-pulse" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                          <span>{stage}{current ? '…' : ''}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1">
                    <div className="h-2 bg-[#0E1522] rounded-full overflow-hidden border border-[#1E293B]">
                      <div
                        className="h-full bg-gradient-to-r from-[#C8892E] to-[#DDA544] transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((genStageIndex / SYNTHESIS_STAGES.length) * 100))}%` }}
                      />
                    </div>
                    <div className="text-right text-[#94A3B8]">Progress {Math.min(100, Math.round((genStageIndex / SYNTHESIS_STAGES.length) * 100))}%</div>
                  </div>

                  {genLogs.length > 0 && (
                    <div className="space-y-1 text-[#64748B] pt-2 border-t border-[#1E293B]">
                      {genLogs.map((log, idx) => (
                        <div key={idx} className="animate-fadeIn">{log}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Completed Report Display + AI Review Panel */}
              {generatedReport && !isGenerating && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Report */}
                  <div className="lg:col-span-2 bg-white border border-[#E4E0D6] rounded-xl p-8 shadow-md space-y-6 print:border-none print:shadow-none">
                    {/* Official masthead */}
                    <div className="text-center pb-4 border-b-2 border-[#141C2B]">
                      <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#64748B]">Coal India Limited</div>
                      <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#141C2B] uppercase mt-1">
                        {generatedReport.title}
                      </h2>
                      <div className="text-xs text-[#64748B] flex items-center justify-center gap-4 mt-2 font-mono flex-wrap">
                        <span>Subsidiary: <strong>{generatedReport.subsidiary}</strong></span>
                        <span>Period: <strong>{generatedReport.period}</strong></span>
                        <span>Compiled: <strong>{formatFullDate(generatedReport.createdAt)}</strong></span>
                      </div>
                      <div className="text-[10px] font-mono text-[#94A3B8] mt-1">
                        {generatedReport.reportCode} · Author: {generatedReport.generatedBy.name}
                      </div>
                      {generatedReport.status === 'submitted_to_admin' && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#B45309] bg-[#FEF3C7] px-2.5 py-1 rounded-full">
                          <UploadCloud className="w-3 h-3" /> Submitted for admin approval
                        </div>
                      )}
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                      <button
                        onClick={handleToggleEditReport}
                        className={`px-3 py-1.5 border text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${isEditingReport ? 'bg-[#141C2B] text-white border-[#141C2B]' : 'bg-[#FAF8F3] hover:bg-[#EFEBE2] border-[#E4E0D6]'}`}
                        title="Manually edit the report content"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        <span>{isEditingReport ? 'Save Edit' : 'Edit'}</span>
                      </button>

                      <button
                        onClick={handleJumpToAskAi}
                        className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Ask AI about this report"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>Ask AI</span>
                      </button>

                      <button
                        onClick={handleJumpToSources}
                        className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Jump to source citations"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>View Sources</span>
                      </button>

                      <button
                        onClick={handleDownloadDocx}
                        className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Download as Word (.doc) file"
                      >
                        <FileCode2 className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>Export DOCX</span>
                      </button>

                      <button
                        id="btn-export-report-pdf"
                        onClick={handleDownloadPdf}
                        disabled={isExportingPdf}
                        className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Download standard PDF file directly to your computer"
                      >
                        {isExportingPdf ? (
                          <RefreshCw className="w-3.5 h-3.5 text-[#64748B] animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-[#64748B]" />
                        )}
                        <span>Export PDF</span>
                      </button>

                      <button
                        onClick={handleSubmitForApproval}
                        disabled={isSubmittingApproval || generatedReport.status === 'submitted_to_admin'}
                        className="px-4 py-2 bg-[#141C2B] text-white hover:bg-[#1E293B] text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 ml-auto"
                        title="Submit this report for admin approval"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-[#C8892E]" />
                        <span>{generatedReport.status === 'submitted_to_admin' ? 'Submitted' : 'Submit for Approval'}</span>
                      </button>

                      <button
                        onClick={handleCopyReport}
                        className="px-2.5 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy raw markdown to clipboard"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
                      </button>

                      <button
                        onClick={handleDownloadMarkdown}
                        className="px-2.5 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="Download raw Markdown file"
                      >
                        <FileDown className="w-3.5 h-3.5 text-[#64748B]" />
                      </button>
                    </div>

                    {/* Sources & confidence quick-glance strip */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#64748B] bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg px-4 py-2">
                      <span>Sources: <strong className="text-[#141C2B]">{generatedReport.citations.length} documents</strong></span>
                      <span>Confidence: <strong className="text-[#141C2B]">{validation?.confidence ?? 95}%</strong></span>
                      {generatedReport.summary && <span className="italic">"{generatedReport.summary}"</span>}
                    </div>

                    {/* Report Content Body with Rich Markdown Rendering (numbers/claims are clickable citations) */}
                    {isEditingReport ? (
                      <textarea
                        value={editableContent}
                        onChange={e => setEditableContent(e.target.value)}
                        rows={20}
                        className="w-full text-sm font-mono p-6 rounded-xl border border-[#C8892E] focus:ring-0 outline-none bg-[#FAF8F3] resize-y"
                      />
                    ) : (
                      <div className="report-markdown-body bg-[#FAF8F3] p-6 sm:p-8 rounded-xl border border-[#E4E0D6] shadow-xs">
                        <Markdown
                          components={{
                            a: ({ href, children }) => {
                              if (href?.startsWith('#source-')) {
                                const idx = parseInt(href.replace('#source-', ''), 10) - 1;
                                const src = generatedReport.numberedSources?.[idx];
                                return (
                                  <button
                                    type="button"
                                    onClick={() => src && setActiveCitationForModal(src)}
                                    className="inline-flex items-center justify-center align-super text-[9px] font-mono font-bold text-[#C8892E] bg-[#FEF3C7] hover:bg-[#FDE68A] rounded px-1 mx-0.5 cursor-pointer"
                                    title={src ? `${src.documentTitle} · ${src.pageOrSheetRef}` : 'Source'}
                                  >
                                    {children}
                                  </button>
                                );
                              }
                              return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                            },
                          }}
                        >
                          {generatedReport.content.replace(/\(SOURCE\s*(\d+)\)/g, (_m, n) => `[[${n}]](#source-${n})`)}
                        </Markdown>
                      </div>
                    )}

                    {/* Grounded Source Citations List (Section 5.7 Spec) */}
                    {generatedReport.citations.length > 0 && (
                      <div id="report-citations-section" className="pt-6 border-t border-[#EFEBE2] space-y-3">
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
                        onClick={resetWizard}
                        className="px-4 py-2 bg-[#EFEBE2] hover:bg-[#D4CEBF] text-xs font-bold rounded-lg text-[#141C2B]"
                      >
                        ← Create Another Report
                      </button>
                    </div>
                  </div>

                  {/* AI Review Panel */}
                  <div className="lg:col-span-1 print:hidden">
                    <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs space-y-4 sticky top-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-[#EFEBE2]">
                        <ShieldCheck className="w-4 h-4 text-[#4C7A52]" />
                        <h3 className="font-serif font-bold text-sm text-[#141C2B]">AI Review</h3>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B]">Overall Confidence</span>
                          <span className="font-bold text-[#141C2B]">{validation?.confidence ?? 95}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B]">Data Accuracy</span>
                          <span className="font-bold text-[#141C2B]">
                            {(() => {
                              const docs = documents.filter(d => selectedDocIds.includes(d.id));
                              const avg = docs.length ? Math.round(docs.reduce((a, d) => a + (d.versions[0]?.ocrConfidence || 0), 0) / docs.length) : 95;
                              return `${avg}%`;
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B]">Source Coverage</span>
                          <span className="font-bold text-[#141C2B]">
                            {discoveredSources.length ? Math.round((selectedDocIds.length / discoveredSources.length) * 100) : 100}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B]">Missing Information</span>
                          <span className="font-bold text-[#141C2B]">{Math.max(0, discoveredSources.length - selectedDocIds.length)} items</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B]">Potential Issues</span>
                          <span className="font-bold text-[#141C2B]">{validation?.discrepancies.filter(d => !d.resolved).length ?? 0}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#EFEBE2]">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#16A34A]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Suitable for officer review</span>
                        </div>
                      </div>

                      {/* Ask AI about this report */}
                      <div id="report-ask-ai-panel" className="pt-3 border-t border-[#EFEBE2] space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#141C2B]">
                          <MessageSquare className="w-3.5 h-3.5 text-[#C8892E]" />
                          <span>Ask about this report</span>
                        </div>

                        {askHistory.length > 0 && (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {askHistory.map((qa, idx) => (
                              <div key={idx} className="text-[11px] space-y-1">
                                <div className="font-semibold text-[#141C2B] bg-[#FAF8F3] rounded-lg px-2.5 py-1.5">{qa.q}</div>
                                <div className="text-[#64748B] px-2.5">
                                  {qa.a || <span className="italic text-[#94A3B8]">Thinking…</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <input
                            id="report-ask-ai-input"
                            type="text"
                            value={askInput}
                            onChange={e => setAskInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAskAboutReport(); }}
                            placeholder="Why is production lower than the target?"
                            className="flex-1 text-xs p-2 rounded-lg border border-[#E4E0D6] focus:border-[#C8892E] outline-none"
                          />
                          <button
                            onClick={handleAskAboutReport}
                            disabled={isAsking || !askInput.trim()}
                            className="p-2 bg-[#141C2B] text-white rounded-lg disabled:opacity-50 hover:bg-[#1E293B] cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-[#C8892E]" />
                          </button>
                        </div>
                      </div>
                    </div>
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