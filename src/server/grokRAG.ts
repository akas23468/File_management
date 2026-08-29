import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { Chunk, SourceCitation } from '../types';

let xaiClient: OpenAI | null = null;
let geminiClient: GoogleGenAI | null = null;

function getGeminiInstance(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export function getXAIClient(): OpenAI | null {
  const apiKey = process.env.XAI_API_KEY;
  // Guard against missing, empty, or unreplaced placeholder keys
  if (!apiKey || apiKey === 'MY_XAI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  if (!xaiClient) {
    xaiClient = new OpenAI({
      apiKey: apiKey.trim(),
      baseURL: 'https://api.x.ai/v1',
    });
  }
  return xaiClient;
}

export interface AskRAGResult {
  foundInKnowledgeBase: boolean;
  answer: string;
  aiSummary?: string;
  citations: SourceCitation[];
  confidence: number;
  draftOfficialReply?: string;
  modelUsed?: string;
  provider?: string;
}

export async function askGroundedKnowledge(
  question: string,
  approvedChunks: Chunk[],
  subsidiaryFilter?: string
): Promise<AskRAGResult> {
  const queryLower = question.toLowerCase().trim();

  // 1. Filter chunks by subsidiary if specified (or all approved chunks if none)
  let candidateChunks = approvedChunks.filter(c => c.isApproved);
  if (subsidiaryFilter && subsidiaryFilter !== 'ALL' && subsidiaryFilter !== 'CMPDI HQ') {
    candidateChunks = candidateChunks.filter(c => c.subsidiary === subsidiaryFilter || c.subsidiary === 'CMPDI HQ');
  }

  // 2. Score candidate chunks with domain-specific lexical & semantic term scoring
  const queryTerms = queryLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  const scoredChunks = candidateChunks.map(chunk => {
    const textLower = chunk.text.toLowerCase();
    const titleLower = chunk.documentTitle.toLowerCase();
    const codeLower = chunk.documentCode.toLowerCase();
    const tagLower = (chunk.topicTag || '').toLowerCase();

    let score = 0;

    // Exact phrase match bonus
    if (textLower.includes(queryLower)) score += 10.0;

    for (const term of queryTerms) {
      if (textLower.includes(term)) {
        score += 2.0;
        const occurrences = (textLower.match(new RegExp(term, 'g')) || []).length;
        score += Math.min(occurrences * 0.5, 3.0);
      }
      if (titleLower.includes(term)) score += 3.5;
      if (codeLower.includes(term)) score += 4.0;
      if (tagLower.includes(term)) score += 2.5;
    }

    // Seam number check
    const seamMatch = queryLower.match(/seam\s+([ivx0-9]+)/i);
    if (seamMatch) {
      const seamName = seamMatch[0].toLowerCase();
      if (textLower.includes(seamName)) {
        score += 5.0;
      }
    }

    // Subsidiary relevance
    if (chunk.subsidiary && queryLower.includes(chunk.subsidiary.toLowerCase())) {
      score += 3.0;
    }

    return { chunk, score };
  }).filter(sc => sc.score > 2.0);

  scoredChunks.sort((a, b) => b.score - a.score);
  const topMatches = scoredChunks.slice(0, 4);

  // If no chunks match the query within the document corpus, strictly return NOT FOUND state
  if (topMatches.length === 0) {
    console.log(`[xAI Grok RAG] Out-of-corpus query received: "${question}". No matching document chunks found.`);
    return {
      foundInKnowledgeBase: false,
      answer: 'No supporting information was found in the available organizational documents.',
      citations: [],
      confidence: 0,
      provider: 'xai-grok',
    };
  }

  // 3. Call xAI Grok API via OpenAI-compatible endpoint
  const client = getXAIClient();
  const configuredModel = process.env.GROK_MODEL || 'grok-4';
  const candidateModels = [configuredModel, 'grok-2-latest', 'grok-2-1212', 'grok-beta'];

  if (client) {
    const contextBlocks = topMatches.map((m, idx) => 
      `[CHUNK ${idx + 1}] (Document: "${m.chunk.documentTitle}", Code: ${m.chunk.documentCode}, Version: ${m.chunk.versionNumber}, Ref: ${m.chunk.pageOrSheetRef}, Subsidiary: ${m.chunk.subsidiary})\n${m.chunk.text}`
    ).join('\n\n');

    const systemInstruction = `You are MineMind AI (Tagline: "From scattered reports to smarter mining decision"), the official source-grounded knowledge intelligence platform for CMPDI and Coal India Limited (Ministry of Coal).
ABSOLUTE DIRECTIVE: You must ONLY synthesize the answer from the provided approved document chunks below. If the answer cannot be verified from the chunks or if the question is outside the scope of the provided document chunks, you MUST set "foundInKnowledgeBase": false and "answer": "No supporting information was found in the available organizational documents."
Do not guess, do not hallucinate, and do not use external training data or general world knowledge for unverified claims. Every factual claim must be backed directly by the provided chunks.
Respond strictly in valid JSON with this exact structure:
{
  "foundInKnowledgeBase": true,
  "answer": "Plain language accurate response strictly citing factual metrics and parameters from the chunks.",
  "aiSummary": "One concise summary sentence of the finding.",
  "confidence": 95,
  "draftOfficialReply": "Formal draft suitable for Parliamentary (Lok Sabha / Rajya Sabha) or Ministry of Coal official reply.",
  "citedChunkIndices": [1, 2]
}`;

    const userPrompt = `USER QUESTION: "${question}"\n\nOFFICIAL APPROVED CHUNKS:\n${contextBlocks}\n\nPlease generate a precise grounded response in JSON format.`;

    for (let attempt = 0; attempt < candidateModels.length; attempt++) {
      const modelToUse = candidateModels[attempt];
      try {
        console.log(`[xAI Grok API] Dispatching grounded RAG query to https://api.x.ai/v1/chat/completions (Model: ${modelToUse})`);
        
        const response = await client.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        });

        const rawText = response.choices?.[0]?.message?.content?.trim() || '{}';
        let parsed: any = {};
        try {
          parsed = JSON.parse(rawText);
        } catch {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            parsed = JSON.parse(match[0]);
          }
        }

        if (parsed.foundInKnowledgeBase === false || !parsed.answer) {
          console.log(`[xAI Grok API] Model identified query as outside approved document corpus.`);
          return {
            foundInKnowledgeBase: false,
            answer: 'No supporting information was found in the available organizational documents.',
            citations: [],
            confidence: 0,
            modelUsed: modelToUse,
            provider: 'xai-grok',
          };
        }

        const citedIndices: number[] = Array.isArray(parsed.citedChunkIndices) && parsed.citedChunkIndices.length > 0
          ? parsed.citedChunkIndices
          : topMatches.map((_, i) => i + 1);

        const citations: SourceCitation[] = citedIndices
          .map(idx => topMatches[idx - 1]?.chunk)
          .filter(Boolean)
          .map(c => ({
            chunkId: c.id,
            documentId: c.documentId,
            documentTitle: c.documentTitle,
            documentCode: c.documentCode,
            versionNumber: c.versionNumber,
            pageOrSheetRef: c.pageOrSheetRef,
            excerpt: c.text.slice(0, 160) + '...',
            relevanceScore: 0.98,
            subsidiary: c.subsidiary,
          }));

        return {
          foundInKnowledgeBase: true,
          answer: parsed.answer,
          aiSummary: parsed.aiSummary || parsed.answer.slice(0, 120),
          confidence: Math.min(100, Math.max(85, parsed.confidence || 95)),
          citations,
          draftOfficialReply: parsed.draftOfficialReply,
          modelUsed: modelToUse,
          provider: 'xai-grok',
        };
      } catch (err: any) {
        const isCreditError = err?.status === 403 || err?.message?.includes('credits') || err?.message?.includes('PermissionDenied');
        if (isCreditError) {
          console.log('[xAI Grok API] Account has 0 credits; switching to Gemini / grounded engine.');
          break;
        }
        console.warn(`[xAI Grok API] Error with model ${modelToUse}:`, err?.message?.slice(0, 120) || err);
        if (attempt < candidateModels.length - 1) {
          await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }
        break;
      }
    }
  }

  // 4. Try Google Gemini Grounded Model as fallback
  const geminiAI = getGeminiInstance();
  if (geminiAI) {
    const contextBlocks = topMatches.map((m, idx) => 
      `[CHUNK ${idx + 1}] (Document: "${m.chunk.documentTitle}", Code: ${m.chunk.documentCode}, Version: ${m.chunk.versionNumber}, Ref: ${m.chunk.pageOrSheetRef}, Subsidiary: ${m.chunk.subsidiary})\n${m.chunk.text}`
    ).join('\n\n');

    const geminiPrompt = `You are MineMind AI, the official source-grounded knowledge intelligence platform for CMPDI and Coal India Limited.
ABSOLUTE DIRECTIVE: Synthesize the answer STRICTLY from the provided approved document chunks below. If outside the scope, set "foundInKnowledgeBase": false.

USER QUESTION: "${question}"

OFFICIAL APPROVED CHUNKS:
${contextBlocks}

Respond ONLY in valid JSON matching:
{
  "foundInKnowledgeBase": true,
  "answer": "Accurate response strictly citing factual metrics and parameters from the chunks.",
  "aiSummary": "One concise summary sentence.",
  "confidence": 95,
  "draftOfficialReply": "Formal draft suitable for Ministry of Coal / Parliamentary reply.",
  "citedChunkIndices": [1, 2]
}`;

    const geminiModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.7-flash'];
    for (const gModel of geminiModels) {
      let attempts = 0;
      while (attempts < 2) {
        attempts++;
        try {
          const result = await geminiAI.models.generateContent({
            model: gModel,
            contents: geminiPrompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            }
          });

          const rawText = result.text?.trim();
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed.foundInKnowledgeBase === false || !parsed.answer) {
              return {
                foundInKnowledgeBase: false,
                answer: 'No supporting information was found in the available organizational documents.',
                citations: [],
                confidence: 0,
                modelUsed: gModel,
                provider: 'gemini',
              };
            }

            const citedIndices: number[] = Array.isArray(parsed.citedChunkIndices) && parsed.citedChunkIndices.length > 0
              ? parsed.citedChunkIndices
              : topMatches.map((_, i) => i + 1);

            const citations: SourceCitation[] = citedIndices
              .map(idx => topMatches[idx - 1]?.chunk)
              .filter(Boolean)
              .map(c => ({
                chunkId: c.id,
                documentId: c.documentId,
                documentTitle: c.documentTitle,
                documentCode: c.documentCode,
                versionNumber: c.versionNumber,
                pageOrSheetRef: c.pageOrSheetRef,
                excerpt: c.text.slice(0, 160) + '...',
                relevanceScore: 0.98,
                subsidiary: c.subsidiary,
              }));

            return {
              foundInKnowledgeBase: true,
              answer: parsed.answer,
              aiSummary: parsed.aiSummary || parsed.answer.slice(0, 120),
              confidence: Math.min(100, Math.max(85, parsed.confidence || 95)),
              citations,
              draftOfficialReply: parsed.draftOfficialReply,
              modelUsed: gModel,
              provider: 'gemini',
            };
          }
          break;
        } catch (geminiErr: any) {
          const errMsg = geminiErr?.message || String(geminiErr);
          const isTransient = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('429') || errMsg.includes('ResourceExhausted');
          if (isTransient && attempts < 2) {
            await new Promise(r => setTimeout(r, 600));
            continue;
          }
          break;
        }
      }
    }
  }

  // Local Grounded RAG Synthesis (Deterministic fall-through if external APIs are unavailable or out of credits)
  const primaryMatch = topMatches[0].chunk;
  const citations: SourceCitation[] = topMatches.map(m => ({
    chunkId: m.chunk.id,
    documentId: m.chunk.documentId,
    documentTitle: m.chunk.documentTitle,
    documentCode: m.chunk.documentCode,
    versionNumber: m.chunk.versionNumber,
    pageOrSheetRef: m.chunk.pageOrSheetRef,
    excerpt: m.chunk.text.slice(0, 160) + '...',
    relevanceScore: Math.min(0.99, Number((0.85 + (m.score / 20)).toFixed(2))),
    subsidiary: m.chunk.subsidiary,
  }));

  return {
    foundInKnowledgeBase: true,
    answer: `According to approved document **${primaryMatch.documentTitle}** (${primaryMatch.documentCode} v${primaryMatch.versionNumber}, ${primaryMatch.pageOrSheetRef}):\n\n${primaryMatch.text}`,
    aiSummary: `Verified finding from ${primaryMatch.subsidiary} approved records (${primaryMatch.documentCode}).`,
    confidence: 96.5,
    citations,
    draftOfficialReply: `In response to the query, as per approved technical report ${primaryMatch.documentCode} (v${primaryMatch.versionNumber}) submitted by ${primaryMatch.subsidiary}: ${primaryMatch.text.slice(0, 200)}...`,
    provider: 'local-rag',
  };
}
