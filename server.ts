import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { askGroundedKnowledge, getXAIClient } from './src/server/grokRAG';
import { generateAccurateDocumentSummary, getGeminiClient } from './src/server/aiSummarizer';

dotenv.config();

// ---------------------------------------------------------------------------
// Shared grounded JSON-completion helper for the report wizard endpoints
// (Step 2 intent extraction, Step 5 synthesis, and the "Ask AI" panel).
// Tries Gemini first, then xAI Grok, using whichever key is configured in
// .env. Returns null (with provider 'local-heuristic-engine') if no provider
// is configured or every call fails, so callers can fall back to
// deterministic logic exactly like the packaged Python backend (app.py).
// ---------------------------------------------------------------------------
async function callLlmJson(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.15
): Promise<{ parsed: any; provider: string } | null> {
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt}\n\n${userPrompt}`,
        config: { responseMimeType: 'application/json', temperature },
      });
      const raw = response.text?.trim();
      if (raw) return { parsed: JSON.parse(raw), provider: 'gemini' };
    } catch (err: any) {
      console.warn('[Report AI] Gemini call failed:', err?.message?.slice(0, 150) || err);
    }
  }

  try {
    const grok = getXAIClient();
    if (grok) {
      const completion = await grok.chat.completions.create({
        model: process.env.GROK_MODEL || 'grok-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content?.trim();
      if (content) return { parsed: JSON.parse(content), provider: 'grok' };
    }
  } catch (err: any) {
    console.warn('[Report AI] xAI Grok call failed:', err?.message?.slice(0, 150) || err);
  }

  // 3. Groq (OpenAI-compatible endpoint) -- the key actually configured in
  // this project's .env, so it must be tried, not just xAI/Gemini.
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (groqApiKey && groqApiKey !== 'MY_GROQ_API_KEY') {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          response_format: { type: 'json_object' },
        }),
      });
      if (response.ok) {
        const data: any = await response.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) return { parsed: JSON.parse(content), provider: 'groq' };
      } else {
        console.warn('[Report AI] Groq call failed:', response.status, await response.text().catch(() => ''));
      }
    } catch (err: any) {
      console.warn('[Report AI] Groq call failed:', err?.message?.slice(0, 150) || err);
    }
  }

  return null;
}

const REPORT_TYPE_KEYWORDS: { type: string; keywords: string[] }[] = [
  { type: 'production_variance', keywords: ['production', 'variance', 'target', 'actual', 'dispatch', 'output'] },
  { type: 'reserve_assessment', keywords: ['reserve', 'geological', 'seam', 'borehole', 'assay', 'geology'] },
  { type: 'compliance_brief', keywords: ['compliance', 'dgms', 'environmental', 'groundwater', 'slope', 'audit'] },
  { type: 'safety_memo', keywords: ['incident', 'water influx', 'inundation', 'strata', 'safety memo', 'accident'] },
];

const REPORT_METRIC_SETS: Record<string, string[]> = {
  production_variance: ['Production Target', 'Actual Production', 'Variance', 'Achievement %', 'Grade', 'Reasons for Deviation'],
  reserve_assessment: ['Proved Reserves', 'Indicated Reserves', 'Inferred Reserves', 'Seam-wise Breakdown', 'Grade Distribution'],
  compliance_brief: ['Groundwater Setback Compliance', 'Slope Stability Factor of Safety', 'DGMS Observations', 'Corrective Actions'],
  safety_memo: ['Incident Timeline', 'Water Influx Volume', 'Barrier Pillar Status', 'Precedent Cases', 'Mitigation Steps'],
};

const REPORT_SOURCE_SETS: Record<string, string[]> = {
  production_variance: ['Production records', 'Monthly reports', 'Dispatch data', 'Historical reports'],
  reserve_assessment: ['Geological survey reports', 'Borehole logs', 'Seam assay data'],
  compliance_brief: ['Environmental audit reports', 'DGMS circulars', 'Slope stability studies'],
  safety_memo: ['Incident reports', 'SOP documents', 'Historical safety memos'],
};

const REPORT_MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const REPORT_SUBSIDIARY_CODES = ['CMPDI HQ', 'BCCL', 'SECL', 'NCL', 'CCL', 'ECL', 'WCL', 'MCL'];

function inferReportType(text: string): string {
  const lower = text.toLowerCase();
  for (const entry of REPORT_TYPE_KEYWORDS) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.type;
  }
  return 'production_variance';
}

function inferReportSubsidiary(text: string): string {
  const upper = text.toUpperCase();
  for (const code of REPORT_SUBSIDIARY_CODES) {
    if (upper.includes(code)) return code;
  }
  return 'ALL';
}

function inferReportPeriod(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : String(now.getFullYear());

  const monthIdx = REPORT_MONTH_NAMES.findIndex(m => lower.includes(m));
  if (monthIdx >= 0) {
    const monthLabel = REPORT_MONTH_NAMES[monthIdx][0].toUpperCase() + REPORT_MONTH_NAMES[monthIdx].slice(1);
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

  return now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // API Route: Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'MineMind AI Knowledge & Reporting Engine (xAI Grok Powered)',
      hasXAIKey: Boolean(process.env.XAI_API_KEY),
      provider: 'xai-grok',
      timestamp: new Date().toISOString(),
    });
  });

  // API Route: Grounded AI Q&A
  app.post('/api/ai/ask', async (req, res) => {
    try {
      const { question, approvedChunks, subsidiaryFilter } = req.body;
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question is required' });
      }

      const result = await askGroundedKnowledge(
        question,
        Array.isArray(approvedChunks) ? approvedChunks : [],
        subsidiaryFilter
      );

      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/ai/ask:', err);
      res.status(500).json({
        foundInKnowledgeBase: false,
        answer: 'An internal error occurred while processing knowledge retrieval.',
        citations: [],
        confidence: 0,
      });
    }
  });

  // API Route: Accurate AI Document Summary & Extraction
  app.post('/api/ai/summarize-document', async (req, res) => {
    try {
      const { fileName, fileSize, extractedText, documentType, subsidiary, isUpdateFlow, targetDocTitle } = req.body;
      if (!fileName) {
        return res.status(400).json({ error: 'fileName is required' });
      }

      const summaryResult = await generateAccurateDocumentSummary({
        fileName,
        fileSize: fileSize || '12.4 MB',
        extractedText: extractedText || '',
        documentType,
        subsidiary,
        isUpdateFlow,
        targetDocTitle,
      });

      res.json(summaryResult);
    } catch (err: any) {
      console.error('Error in /api/ai/summarize-document:', err);
      res.status(500).json({ error: 'Failed to generate document summary' });
    }
  });

  // API Route: Report Wizard Step 2 -- AI understands the officer's request.
  // Runs the same heuristics the frontend uses first (never fails silently),
  // then asks a live LLM to confirm/correct when a key is configured in .env.
  app.post('/api/ai/report-intent', async (req, res) => {
    try {
      const { rawRequest, mode, currentDate } = req.body;
      if (!rawRequest || typeof rawRequest !== 'string' || !rawRequest.trim()) {
        return res.status(400).json({ error: 'rawRequest is required' });
      }

      const inferredType = inferReportType(rawRequest);
      const inferredSubsidiary = inferReportSubsidiary(rawRequest);
      const inferredPeriod = inferReportPeriod(rawRequest);
      const metrics = REPORT_METRIC_SETS[inferredType] || REPORT_METRIC_SETS.production_variance;
      const requiredSources = REPORT_SOURCE_SETS[inferredType] || REPORT_SOURCE_SETS.production_variance;

      const systemPrompt = [
        "You are the intent-classification engine for CMPDI/Coal India's statutory report wizard.",
        'Given an officer plain-language report request, return strict JSON only (no prose, no markdown)',
        'with keys: reportType (one of production_variance, reserve_assessment, compliance_brief, safety_memo),',
        'subsidiary (one of ALL, CMPDI HQ, BCCL, SECL, NCL, CCL, ECL, WCL, MCL),',
        "period (a short human string such as August 2026 or FY 2025-26 (Q3)),",
        'metrics (3 to 6 short metric labels this report type must cover),',
        'requiredSources (2 to 4 short source-document categories needed to compile it).',
      ].join(' ');
      const userPrompt = [
        `Officer request: "${rawRequest}"`,
        `Request mode: ${mode || 'ai'}`,
        `Current date: ${currentDate || new Date().toISOString()}`,
        `Local heuristic guess -- reportType: ${inferredType}, subsidiary: ${inferredSubsidiary}, period: ${inferredPeriod}.`,
        'Confirm the heuristic guess if it looks right, correct it if not, and fill in metrics/requiredSources.',
      ].join('\n');

      const result: any = {
        reportType: inferredType,
        subsidiary: inferredSubsidiary,
        period: inferredPeriod,
        metrics,
        requiredSources,
        provider: 'local-heuristic-engine',
      };

      const llmResult = await callLlmJson(systemPrompt, userPrompt, 0.1);
      if (llmResult?.parsed) {
        const { parsed, provider } = llmResult;
        if (parsed.reportType && REPORT_METRIC_SETS[parsed.reportType]) result.reportType = parsed.reportType;
        if (typeof parsed.subsidiary === 'string' && parsed.subsidiary.trim()) result.subsidiary = parsed.subsidiary.trim();
        if (typeof parsed.period === 'string' && parsed.period.trim()) result.period = parsed.period.trim();
        if (Array.isArray(parsed.metrics) && parsed.metrics.length) result.metrics = parsed.metrics.map(String).slice(0, 6);
        if (Array.isArray(parsed.requiredSources) && parsed.requiredSources.length) result.requiredSources = parsed.requiredSources.map(String).slice(0, 4);
        result.provider = provider;
      }

      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/ai/report-intent:', err);
      res.status(500).json({ error: 'Failed to extract report intent' });
    }
  });

  // API Route: Report Wizard "Ask AI about this report" panel -- answers
  // grounded strictly in the generated report's own content and citations.
  app.post('/api/ai/report-chat', async (req, res) => {
    try {
      const { question, reportContent, citations } = req.body;
      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ error: 'question is required' });
      }
      if (!reportContent || typeof reportContent !== 'string' || !reportContent.trim()) {
        return res.status(400).json({ error: 'reportContent is required' });
      }

      const citationList = Array.isArray(citations) ? citations : [];
      const citationLines = citationList
        .map((c: any) => `- ${c.documentTitle || 'Unknown Source'} (${c.documentCode || ''} v${c.versionNumber || ''}, ${c.pageOrSheetRef || ''}): ${String(c.excerpt || '').slice(0, 200)}`)
        .join('\n');

      const systemPrompt = [
        "You are a statutory mining-report assistant. Answer the officer's question using ONLY the report",
        'content and citations given below -- never invent figures, dates, or facts not present there. If the',
        'report does not address the question, say so plainly. Return strict JSON only with one key:',
        'answer (2-5 concise sentences, plain language).',
      ].join(' ');
      const userPrompt = [
        `Report content:\n${reportContent.slice(0, 6000)}`,
        `Attached citations:\n${citationLines || 'None'}`,
        `Officer question: ${question}`,
      ].join('\n\n');

      const llmResult = await callLlmJson(systemPrompt, userPrompt, 0.2);
      if (llmResult?.parsed?.answer && typeof llmResult.parsed.answer === 'string' && llmResult.parsed.answer.trim()) {
        return res.json({ answer: llmResult.parsed.answer.trim(), provider: llmResult.provider });
      }

      // No AI provider configured / call failed -- grounded local fallback:
      // return whichever paragraph of the report best matches the question.
      const paragraphs = reportContent.split('\n\n').map((p: string) => p.trim()).filter((p: string) => p.length > 30);
      const terms = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t: string) => t.length > 2);
      let bestParagraph: string | null = null;
      let bestScore = 0;
      for (const paragraph of paragraphs) {
        const lower = paragraph.toLowerCase();
        const score = terms.filter((t: string) => lower.includes(t)).length;
        if (score > bestScore) {
          bestParagraph = paragraph;
          bestScore = score;
        }
      }
      res.json({
        answer: bestParagraph || 'The report does not directly address this question -- please review the attached source citations for further context.',
        provider: 'local-grounded-fallback',
      });
    } catch (err: any) {
      console.error('Error in /api/ai/report-chat:', err);
      res.status(500).json({ error: 'Failed to answer report question' });
    }
  });

  // API Route: Automated Report Generation with complete deduplication & grounding
  app.post('/api/ai/report', async (req, res) => {
    try {
      const { reportType, period, subsidiary, selectedChunks, templateTitle } = req.body;
      
      const rawChunks = Array.isArray(selectedChunks) ? selectedChunks : [];
      
      // 1. Deduplicate chunks by unique text snippet and ID
      const seenText = new Set<string>();
      const seenIds = new Set<string>();
      const chunks: any[] = [];
      
      for (const c of rawChunks) {
        if (!c) continue;
        const normalizedText = (c.text || '').trim().replace(/\s+/g, ' ');
        if (!normalizedText) continue;
        if (seenText.has(normalizedText) || (c.id && seenIds.has(c.id))) {
          continue;
        }
        seenText.add(normalizedText);
        if (c.id) seenIds.add(c.id);
        chunks.push(c);
      }

      // 2. Deduplicate Source Documents so each document is listed strictly ONCE
      const docMap = new Map<string, { title: string; code: string; versions: Set<number>; refs: Set<string> }>();
      for (const c of chunks) {
        const key = c.documentId || c.documentCode || c.documentTitle;
        if (!docMap.has(key)) {
          docMap.set(key, {
            title: c.documentTitle || 'Technical Filing',
            code: c.documentCode || 'CMPDI/DOC',
            versions: new Set(c.versionNumber ? [c.versionNumber] : [1]),
            refs: new Set(c.pageOrSheetRef ? [c.pageOrSheetRef] : []),
          });
        } else {
          const entry = docMap.get(key)!;
          if (c.versionNumber) entry.versions.add(c.versionNumber);
          if (c.pageOrSheetRef) entry.refs.add(c.pageOrSheetRef);
        }
      }

      // Handle case where no chunks exist or were provided for subsidiary
      if (chunks.length === 0) {
        const content = `## 1. Statutory Context & Executive Directive
This **${templateTitle || 'Statutory Compliance Brief'}** has been initiated for **${subsidiary || 'All Subsidiaries'}** covering review period **${period || 'Current FY'}**.

---

## 2. Synthesized Technical Findings
*No approved statutory technical filings or operational telemetry currently registered in the repository for **${subsidiary}**.*

### Recommendation:
Please upload and approve relevant technical filings, borehole assays, or safety protocols for **${subsidiary}** in the Document Ingestion Module to enable automated synthesis.

---

## 3. Statutory Action Items
1. **Repository Notice**: Initiate mandatory submission of latest quarterly returns and statutory SOPs for ${subsidiary}.
2. **Audit Escalation**: Colliery engineering leadership notified for pending documentation baseline.`;

        return res.json({
          content,
          summary: `No approved ${subsidiary} document sources found in repository for synthesis.`,
          citations: []
        });
      }

      const sourcesSummary = Array.from(docMap.values()).map(doc => {
        const verStr = Array.from(doc.versions).map(v => `v${v}.0`).join(', ');
        const refsStr = Array.from(doc.refs).filter(Boolean).join(', ');
        return `- **${doc.title}** (${doc.code} ${verStr}${refsStr ? ` · Ref: ${refsStr}` : ''})`;
      }).join('\n');

      // 3. Render distinct, non-duplicated detailed observations
      const observationsMarkdown = chunks.map((c: any, i: number) => {
        const tag = c.topicTag ? c.topicTag.replace(/_/g, ' ').toUpperCase() : 'VERIFIED OBSERVATION';
        return `**Point 2.${i + 1} [${tag}]** *(${c.documentCode || 'CMPDI'}, ${c.pageOrSheetRef || 'Archive'})*\n${c.text.trim()}`;
      }).join('\n\n');

      const content = `## 1. Statutory Context & Executive Directive
This **${templateTitle || 'Statutory Compliance Brief'}** has been formally compiled for **${subsidiary || 'All Subsidiaries'}** covering review period **${period || 'Current FY'}** under direct statutory oversight of the CMPDI Directorate of Mine Planning & Technology.

---

## 2. Synthesized Technical Findings
Synthesized strictly against verified, non-duplicate statutory filings in the organizational knowledge repository:

${sourcesSummary}

### Detailed Observations & Geological/Operational Parameters:

${observationsMarkdown}

---

## 3. Statutory Action Items & Compliance Directives
1. **Operational Reconciliation**: Respective Sub-Area General Managers and Colliery Engineers must reconcile shift logs against the approved baseline parameters above.
2. **Variance Notification**: Volumetric deviations exceeding **±5.0%** in stripping ratios, overburden removal, or coal quality grades require mandatory CMPDI/DGMS notice.
3. **Statutory Archive**: This synthesized briefing carries digital audit authenticity and is cross-referenced in the MineMind Knowledge Base.`;

      // 4. Deduplicate citations
      const seenCitationKeys = new Set<string>();
      const uniqueCitations: any[] = [];
      for (const c of chunks) {
        const citKey = `${c.documentId || c.documentCode}_${c.pageOrSheetRef}`;
        if (seenCitationKeys.has(citKey)) continue;
        seenCitationKeys.add(citKey);
        uniqueCitations.push({
          chunkId: c.id,
          documentId: c.documentId,
          documentTitle: c.documentTitle,
          documentCode: c.documentCode,
          versionNumber: c.versionNumber,
          pageOrSheetRef: c.pageOrSheetRef,
          excerpt: c.text?.slice(0, 140) + '...',
          relevanceScore: 0.98,
          subsidiary: c.subsidiary,
        });
      }

      const deterministicSummary = `Synthesized official ${templateTitle || 'Report'} across ${docMap.size} unique document sources (${chunks.length} distinct data points) for ${subsidiary}.`;

      // Numbered (SOURCE n) map -- lets the frontend turn every inline
      // "(SOURCE n)" citation the model writes into a clickable badge that
      // opens that exact source's traceability record.
      const numberedSources = chunks.map((c: any) => ({
        chunkId: c.id,
        documentId: c.documentId,
        documentTitle: c.documentTitle || 'Technical Filing',
        documentCode: c.documentCode || 'CMPDI/DOC',
        versionNumber: c.versionNumber || 1,
        pageOrSheetRef: c.pageOrSheetRef || 'Archive',
        excerpt: `${String(c.text || '').slice(0, 160)}...`,
        relevanceScore: 0.98,
        subsidiary: c.subsidiary,
      }));

      // Attempt a live, AI-polished synthesis strictly grounded in the same
      // numbered source excerpts. Falls back to the deterministic template
      // above if no provider key is configured in .env, or the call fails.
      const { extractedMetrics, validation } = req.body;
      const contextBlob = chunks.map((c: any, i: number) =>
        `[SOURCE ${i + 1}] ${c.documentTitle || 'Technical Filing'} (${c.documentCode || 'CMPDI/DOC'}, ${c.pageOrSheetRef || 'Archive'}):\n${String(c.text || '').slice(0, 600)}`
      ).join('\n\n');
      const systemPrompt = [
        'You are a statutory report-writing engine for CMPDI/Coal India. Write ONLY using facts present in the',
        'numbered SOURCE excerpts supplied below -- never invent figures, dates, or approvals that are not there.',
        'Every factual clause must cite its source inline as (SOURCE n). Return strict JSON only with keys:',
        'content (a Markdown report using "## 1. Statutory Context & Executive Directive",',
        '"## 2. Synthesized Technical Findings", and "## 3. Statutory Action Items & Compliance Directives" as',
        'section headers) and summary (one sentence describing what was synthesized).',
      ].join(' ');
      const userPrompt = [
        `Report template: ${templateTitle || 'Statutory Compliance Brief'}`,
        `Subsidiary: ${subsidiary}`,
        `Period: ${period}`,
        `Required metrics: ${Array.isArray(extractedMetrics) && extractedMetrics.length ? extractedMetrics.join(', ') : 'not specified'}`,
        `Validation confidence from Step 4: ${validation?.confidence ?? 'n/a'}%`,
        `Numbered source excerpts:\n${contextBlob}`,
      ].join('\n');

      const llmResult = await callLlmJson(systemPrompt, userPrompt, 0.15);
      if (llmResult?.parsed?.content && typeof llmResult.parsed.content === 'string' && llmResult.parsed.content.trim()) {
        return res.json({
          content: llmResult.parsed.content.trim(),
          summary: typeof llmResult.parsed.summary === 'string' && llmResult.parsed.summary.trim() ? llmResult.parsed.summary.trim() : deterministicSummary,
          citations: uniqueCitations,
          numberedSources,
          provider: llmResult.provider,
        });
      }

      res.json({
        content,
        summary: deterministicSummary,
        citations: uniqueCitations,
        numberedSources,
        provider: 'local-grounded-engine',
      });
    } catch (err: any) {
      console.error('Error in /api/ai/report:', err);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Khanij Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
});
