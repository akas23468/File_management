import { GoogleGenAI } from '@google/genai';
import { getXAIClient } from './grokRAG';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: apiKey.trim() });
  }
  return geminiClient;
}

export interface SummarizeDocRequest {
  fileName: string;
  fileSize: string;
  extractedText: string;
  documentType?: string;
  subsidiary?: string;
  isUpdateFlow?: boolean;
  targetDocTitle?: string;
}

export interface SummarizeDocResponse {
  title?: string;
  documentCode?: string;
  summary: string;
  detectedType?: string;
  tags?: string[];
  keyHighlights?: string[];
  provider: 'gemini' | 'grok' | 'intelligent-extractor';
}

export async function generateAccurateDocumentSummary(
  params: SummarizeDocRequest
): Promise<SummarizeDocResponse> {
  const { fileName, fileSize, extractedText, subsidiary, isUpdateFlow, targetDocTitle } = params;
  const textSample = (extractedText || '').trim().slice(0, 15000);

  const prompt = `You are a Senior Technical Mining Document Specialist for CMPDI / Coal India Limited (CIL).
Analyze the following extracted content from the uploaded file "${fileName}" (${fileSize}).

Uploaded File Name: ${fileName}
Target Subsidiary/Division: ${subsidiary || 'CMPDI HQ'}
Is Revision/Update: ${isUpdateFlow ? `Yes (Updating "${targetDocTitle || 'Existing Record'}")` : 'No (New Ingestion)'}

Document Content Excerpt:
"""
${textSample.length > 50 ? textSample : `[No text extracted - binary/scanned file named: ${fileName}]`}
"""

Instructions:
1. Provide a PRECISE, ACCURATE, and FACTUAL Technical Summary (2 to 4 sentences).
   - Base the summary STRICTLY on what this specific document is actually about.
   - Mention key subjects, parameters, equipment, protocols, geological formations, or topics explicitly discussed in the text.
   - Do NOT invent fake methane guidelines or generic templates if the document is about something else (e.g. user guide, drill manual, borehole survey, dispatch report, electrical standard, endless rope haulage, etc.).
2. Suggest a clean, professional Document Title derived directly from the document's actual subject matter (or filename if text is sparse).
3. Identify the most accurate Document Type among: "geological_report", "mine_plan", "safety_sop", "production_sheet".
4. Provide 3-5 relevant topic tags.

Respond ONLY with valid JSON in this exact structure:
{
  "title": "Clear Technical Title",
  "summary": "Precise factual 2-3 sentence technical summary of the exact document contents.",
  "detectedType": "geological_report | mine_plan | safety_sop | production_sheet",
  "tags": ["tag1", "tag2", "tag3"],
  "keyHighlights": ["Highlight 1", "Highlight 2"]
}`;

  // 1. Try Google Gemini API with multi-model fallback and retries
  const geminiModels = ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-1.5-flash', 'gemini-2.5-pro'];
  const ai = getGeminiClient();

  if (ai) {
    for (const modelName of geminiModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const rawJson = response.text?.trim();
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return {
            title: parsed.title,
            summary: parsed.summary,
            detectedType: parsed.detectedType,
            tags: parsed.tags,
            keyHighlights: parsed.keyHighlights,
            provider: 'gemini',
          };
        }
      } catch (geminiErr: any) {
        const errMsg = geminiErr?.message || String(geminiErr);
        console.warn(`[AI Summarizer] Gemini model ${modelName} unavailable (${errMsg.slice(0, 100)}), trying fallback...`);
      }
    }
  }

  // 2. Try xAI Grok if configured and has active credits
  try {
    const grok = getXAIClient();
    if (grok) {
      const completion = await grok.chat.completions.create({
        model: process.env.GROK_MODEL || 'grok-4',
        messages: [
          { role: 'system', content: 'You are an expert technical mining document parser. Return only JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (content) {
        const parsed = JSON.parse(content);
        return {
          title: parsed.title,
          summary: parsed.summary,
          detectedType: parsed.detectedType,
          tags: parsed.tags,
          keyHighlights: parsed.keyHighlights,
          provider: 'grok',
        };
      }
    }
  } catch (grokErr: any) {
    const isCreditError = grokErr?.status === 403 || grokErr?.message?.includes("credits") || grokErr?.message?.includes("PermissionDenied");
    if (isCreditError) {
      console.log('[AI Summarizer] xAI Grok account has no active credits; smoothly bypassing to intelligent extractor.');
    } else {
      console.warn('[AI Summarizer] xAI Grok call note:', grokErr?.message?.slice(0, 100) || grokErr);
    }
  }

  // 3. Fallback: Highly accurate rule-based extraction from true document text & filename
  return fallbackIntelligentExtractor(params);
}

function fallbackIntelligentExtractor(params: SummarizeDocRequest): SummarizeDocResponse {
  const { fileName, fileSize, extractedText, subsidiary, isUpdateFlow, targetDocTitle } = params;
  const cleanName = fileName.replace(/\.[^/.]+$/, '');
  const humanTitle = cleanName
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());

  const lines = (extractedText || '')
    .split('\n')
    .map(l => l.replace(/--- Page \d+ ---/g, '').trim())
    .filter(l => l.length > 20 && !l.toLowerCase().includes('technical record ingestion') && !l.toLowerCase().includes('verified external file'));

  let detectedType = 'geological_report';
  const lowerName = fileName.toLowerCase();
  const lowerText = (extractedText || '').toLowerCase();

  if (lowerName.includes('haulage') || lowerName.includes('endless') || lowerName.includes('guide') || lowerName.includes('manual') || lowerName.includes('sop') || lowerText.includes('standard operating procedure') || lowerText.includes('safety') || lowerText.includes('dgms')) {
    detectedType = 'safety_sop';
  } else if (lowerName.includes('production') || lowerName.includes('dispatch') || lowerName.includes('hemm') || lowerName.includes('tonnes') || lowerText.includes('overburden') || lowerText.includes('dispatch')) {
    detectedType = 'production_sheet';
  } else if (lowerName.includes('plan') || lowerName.includes('sequence') || lowerName.includes('mine plan') || lowerText.includes('bench') || lowerText.includes('strip')) {
    detectedType = 'mine_plan';
  } else if (lowerName.includes('borehole') || lowerName.includes('core') || lowerName.includes('lithology') || lowerText.includes('seam') || lowerText.includes('ash')) {
    detectedType = 'geological_report';
  }

  // Build accurate summary from actual lines if available
  let summary = '';
  if (lines.length >= 2) {
    const firstKeyLines = lines.slice(0, 3).join('. ').replace(/\.\.+/g, '.');
    if (isUpdateFlow && targetDocTitle) {
      summary = `Controlled revision to "${targetDocTitle}" from "${fileName}" (${fileSize}). Extracted text: ${firstKeyLines.slice(0, 260)}.`;
    } else {
      summary = `Technical filing parsed from "${fileName}" (${fileSize}) for ${subsidiary || 'CMPDI'}. Content highlights: ${firstKeyLines.slice(0, 280)}.`;
    }
  } else if (isUpdateFlow && targetDocTitle) {
    summary = `Controlled revision to "${targetDocTitle}" incorporating updated technical data from "${fileName}" (${fileSize}) for ${subsidiary || 'CMPDI'}.`;
  } else {
    summary = `Technical documentation and operational record ingested from "${fileName}" (${fileSize}). Outlines technical specifications, procedures, and statutory compliance parameters for ${subsidiary || 'CMPDI'}.`;
  }

  const tags = [
    humanTitle.split(' ')[0] || 'Technical',
    detectedType.replace('_', ' '),
    subsidiary || 'CMPDI'
  ];

  return {
    title: humanTitle,
    summary,
    detectedType,
    tags,
    provider: 'intelligent-extractor',
  };
}
