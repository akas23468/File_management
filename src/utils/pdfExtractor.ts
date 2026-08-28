import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for Vite
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Use unpkg/cdnjs worker fallback or standard worker path
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

/**
 * Extracts plain text from a PDF File or ArrayBuffer.
 */
export async function extractTextFromPdf(fileOrBuffer: File | ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  try {
    let arrayBuffer: ArrayBuffer;
    if (fileOrBuffer instanceof File) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      arrayBuffer = fileOrBuffer;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const pageTexts: string[] = [];

    // Extract text from pages (up to first 25 pages for performance)
    const maxPagesToScan = Math.min(pageCount, 25);
    for (let i = 1; i <= maxPagesToScan; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => (item.str ? item.str : ''))
        .join(' ');
      
      if (pageStrings.trim().length > 0) {
        pageTexts.push(`--- Page ${i} ---\n${pageStrings.trim()}`);
      }
    }

    const fullText = pageTexts.join('\n\n');
    if (fullText.trim().length > 20) {
      return { text: fullText, pageCount };
    }
  } catch (err) {
    console.warn('[pdfExtractor] Standard PDF.js extraction encountered note, trying raw stream scanner:', err);
  }

  // Fallback heuristic: stream scan for readable ASCII/UTF-8 text chunks in PDF stream
  try {
    let rawBuffer: ArrayBuffer;
    if (fileOrBuffer instanceof File) {
      rawBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      rawBuffer = fileOrBuffer;
    }

    const bytes = new Uint8Array(rawBuffer);
    let extractedChunks: string[] = [];
    let currentChunk = '';

    // Scan for printable ascii sequences longer than 4 chars
    for (let i = 0; i < Math.min(bytes.length, 500000); i++) {
      const b = bytes[i];
      if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
        currentChunk += String.fromCharCode(b);
      } else {
        if (currentChunk.length > 5 && !currentChunk.startsWith('obj') && !currentChunk.startsWith('endobj')) {
          // Filter out typical raw postscript keywords
          const cleaned = currentChunk.replace(/[\/\\\[\]\(\)\<\>]/g, ' ').trim();
          if (cleaned.length > 10 && !cleaned.includes('FontDescriptor') && !cleaned.includes('FlateDecode')) {
            extractedChunks.push(cleaned);
          }
        }
        currentChunk = '';
      }
    }

    const combined = extractedChunks.slice(0, 50).join('\n');
    if (combined.length > 30) {
      return { text: combined, pageCount: 1 };
    }
  } catch (rawErr) {
    console.warn('[pdfExtractor] Raw scan fallback note:', rawErr);
  }

  return { text: '', pageCount: 0 };
}
