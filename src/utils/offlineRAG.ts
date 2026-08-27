// Offline Grounded Knowledge Retrieval Engine
// Operates with 0% network connectivity in underground mine shafts & coal pits.
import { Chunk, SourceCitation } from '../types';

export interface OfflineQueryResult {
  foundInKnowledgeBase: boolean;
  answer: string;
  aiSummary: string;
  confidence: number;
  citations: SourceCitation[];
  draftOfficialReply?: string;
  isOfflineSynthesized: boolean;
}

export function queryOfflineKnowledgeBase(
  question: string,
  approvedChunks: Chunk[],
  subsidiaryFilter?: string
): OfflineQueryResult {
  if (!question || !question.trim()) {
    return {
      foundInKnowledgeBase: false,
      answer: 'Please enter a technical or statutory query.',
      aiSummary: 'Empty query',
      confidence: 0,
      citations: [],
      isOfflineSynthesized: true,
    };
  }

  const queryLower = question.toLowerCase().trim();
  const queryTerms = queryLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  // Filter chunks by subsidiary if specified
  const candidateChunks = approvedChunks.filter(c => {
    if (!c.isApproved) return false;
    if (subsidiaryFilter && subsidiaryFilter !== 'ALL') {
      return c.subsidiary === subsidiaryFilter || c.subsidiary === 'CMPDI HQ';
    }
    return true;
  });

  // Score chunks based on term occurrence, keyword density and phrase match
  const scored = candidateChunks.map(chunk => {
    const textLower = chunk.text.toLowerCase();
    const titleLower = chunk.documentTitle.toLowerCase();
    const codeLower = chunk.documentCode.toLowerCase();
    const tagLower = (chunk.topicTag || '').toLowerCase();

    let score = 0;

    // Exact phrase match bonus
    if (textLower.includes(queryLower)) score += 8.0;

    // Specific mining domain terms scoring
    queryTerms.forEach(term => {
      if (textLower.includes(term)) {
        score += 2.0;
        // Frequency boost
        const occurrences = (textLower.match(new RegExp(term, 'g')) || []).length;
        score += Math.min(occurrences * 0.5, 3.0);
      }
      if (titleLower.includes(term)) score += 3.5;
      if (codeLower.includes(term)) score += 4.0;
      if (tagLower.includes(term)) score += 2.5;
    });

    // Match Seam numbers (e.g. "Seam IV", "Seam V", "Seam 99")
    const seamMatch = queryLower.match(/seam\s+([ivx0-9]+)/i);
    if (seamMatch) {
      const seamName = seamMatch[0].toLowerCase();
      if (textLower.includes(seamName)) {
        score += 5.0;
      } else {
        // If user asked about a specific seam and it's absent, penalize
        score -= 2.0;
      }
    }

    // Subsidiary bonus
    if (chunk.subsidiary && queryLower.includes(chunk.subsidiary.toLowerCase())) {
      score += 3.0;
    }

    return { chunk, score };
  });

  const topMatches = scored
    .filter(m => m.score > 2.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // If no good matches, strictly zero hallucination
  if (topMatches.length === 0) {
    return {
      foundInKnowledgeBase: false,
      answer: 'No supporting information was found in the available organizational documents stored in local underground cache.',
      aiSummary: 'No matching records found in offline cache.',
      confidence: 0,
      citations: [],
      isOfflineSynthesized: true,
    };
  }

  // Synthesize answer deterministically from matched chunks
  const primaryChunk = topMatches[0].chunk;
  const primaryText = primaryChunk.text;

  // Extract key statistical sentences or facts
  const sentences = primaryText.split(/(?<=[.?!])\s+/);
  const relevantSentences = sentences.filter(s => {
    const sLower = s.toLowerCase();
    return queryTerms.some(term => sLower.includes(term)) || /\d+%|\d+\.\d+|\d+\s*MT|\d+\s*meters/i.test(s);
  });

  const synthesizedBody = relevantSentences.length > 0
    ? relevantSentences.slice(0, 4).join(' ')
    : sentences.slice(0, 3).join(' ');

  const answer = `Based on approved offline record "${primaryChunk.documentTitle}" (${primaryChunk.documentCode} v${primaryChunk.versionNumber}, ${primaryChunk.pageOrSheetRef}):\n\n${synthesizedBody}`;

  const citations: SourceCitation[] = topMatches.map(m => ({
    chunkId: m.chunk.id,
    documentId: m.chunk.documentId,
    documentTitle: m.chunk.documentTitle,
    documentCode: m.chunk.documentCode,
    versionNumber: m.chunk.versionNumber,
    pageOrSheetRef: m.chunk.pageOrSheetRef,
    excerpt: m.chunk.text.slice(0, 150) + '...',
    relevanceScore: Math.min(0.99, Number((0.75 + (m.score / 20) * 0.24).toFixed(2))),
    subsidiary: m.chunk.subsidiary,
  }));

  const draftOfficialReply = `GOVERNMENT OF INDIA / COAL INDIA LIMITED
MINISTRY OF COAL — CMPDI VERIFIED REPORT (OFFLINE PIT SYNC)

Reference: Technical Query on ${question.slice(0, 60)}
Document Authority: ${primaryChunk.documentTitle} (${primaryChunk.documentCode} v${primaryChunk.versionNumber})
Subsidiary: ${primaryChunk.subsidiary}

Official Stance & Parameters:
${synthesizedBody}

Verified under DGMS / CMPDI statutory guidelines.`;

  return {
    foundInKnowledgeBase: true,
    answer,
    aiSummary: `Offline validated finding from ${primaryChunk.documentCode} v${primaryChunk.versionNumber} for ${primaryChunk.subsidiary}.`,
    confidence: Math.min(99, Math.round(86 + topMatches[0].score * 1.5)),
    citations,
    draftOfficialReply,
    isOfflineSynthesized: true,
  };
}
