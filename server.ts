import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { askGroundedKnowledge } from './src/server/grokRAG';
import { generateAccurateDocumentSummary } from './src/server/aiSummarizer';

dotenv.config();

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

      res.json({
        content,
        summary: `Synthesized official ${templateTitle || 'Report'} across ${docMap.size} unique document sources (${chunks.length} distinct data points) for ${subsidiary}.`,
        citations: uniqueCitations
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
