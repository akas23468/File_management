import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { askGroundedKnowledge } from './src/server/geminiRAG';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // API Route: Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Khanij AI Knowledge & Reporting Engine',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
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

  // API Route: Automated Report Generation
  app.post('/api/ai/report', async (req, res) => {
    try {
      const { reportType, period, subsidiary, selectedChunks, templateTitle } = req.body;
      
      const chunks = Array.isArray(selectedChunks) ? selectedChunks : [];
      const sourcesSummary = chunks.map((c: any) => `- ${c.documentTitle} (${c.documentCode} v${c.versionNumber}, ${c.pageOrSheetRef})`).join('\n');

      const content = `## 1. Statutory Context & Executive Directive
This ${templateTitle || 'Statutory Compliance Brief'} has been compiled for **${subsidiary || 'All Subsidiaries'}** for period **${period || 'Current FY'}** under direct oversight of CMPDI Knowledge & Verification Directorate.

## 2. Synthesized Technical Findings
Based on approved organizational knowledge base filings:
${sourcesSummary}

### Detailed Observations:
${chunks.map((c: any, i: number) => `**Point 2.${i + 1} (${c.topicTag || 'Operational Data'}):** ${c.text}`).join('\n\n')}

## 3. Statutory Action Items & Next Steps
1. All respective sub-area managers must cross-check monthly returns against the approved parameters above.
2. Discrepancies exceeding ±5.0% require immediate DGMS/CMPDI notification.`;

      res.json({
        content,
        summary: `Synthesized official ${templateTitle || 'Report'} across ${chunks.length} approved document sources for ${subsidiary}.`,
        citations: chunks.map((c: any) => ({
          chunkId: c.id,
          documentId: c.documentId,
          documentTitle: c.documentTitle,
          documentCode: c.documentCode,
          versionNumber: c.versionNumber,
          pageOrSheetRef: c.pageOrSheetRef,
          excerpt: c.text?.slice(0, 140) + '...',
          relevanceScore: 0.98,
          subsidiary: c.subsidiary,
        }))
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
