import { Chunk, Document, DocumentVersion } from '../types';

const TARGET_CHUNK_LENGTH = 900;
const CHUNK_OVERLAP = 160;

function createChunkId(): string {
  return crypto.randomUUID();
}

function splitLongText(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= TARGET_CHUNK_LENGTH) return normalized ? [normalized] : [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + TARGET_CHUNK_LENGTH, normalized.length);
    if (end < normalized.length) {
      const sentenceBreak = Math.max(
        normalized.lastIndexOf('. ', end),
        normalized.lastIndexOf('? ', end),
        normalized.lastIndexOf('! ', end),
        normalized.lastIndexOf('; ', end)
      );
      if (sentenceBreak > start + Math.floor(TARGET_CHUNK_LENGTH * 0.55)) {
        end = sentenceBreak + 1;
      }
    }

    const chunkText = normalized.slice(start, end).trim();
    if (chunkText) chunks.push(chunkText);
    if (end >= normalized.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

export function createDocumentChunks(
  document: Document,
  version: DocumentVersion,
  isApproved: boolean = version.approvalStatus === 'approved'
): Chunk[] {
  const sourceText = version.extractedText?.trim();
  if (!sourceText) return [];

  const pageSections = sourceText.split(/(?=---\s*Page\s+\d+\s*---)/i);
  const sections = pageSections.length > 0 ? pageSections : [sourceText];

  return sections.flatMap((section, sectionIndex) => {
    const pageMatch = section.match(/---\s*Page\s+(\d+)\s*---/i);
    const pageNumber = pageMatch?.[1] || String(sectionIndex + 1);
    const textWithoutMarker = section.replace(/---\s*Page\s+\d+\s*---/i, '').trim();

    return splitLongText(textWithoutMarker).map((text, chunkIndex) => ({
      id: createChunkId(),
      documentId: document.id,
      documentTitle: document.title,
      documentCode: document.documentCode,
      documentVersionId: version.id,
      versionNumber: version.versionNumber,
      subsidiary: document.subsidiary,
      pageOrSheetRef: `Page ${pageNumber}${chunkIndex ? `, passage ${chunkIndex + 1}` : ''}`,
      topicTag: document.tags[0] || document.type.replace(/_/g, ' '),
      isApproved,
      text,
    }));
  });
}