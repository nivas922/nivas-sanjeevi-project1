import { v4 as uuidv4 } from "uuid";

export const CHUNK_CONFIG = {
  DEFAULT_CHUNK_SIZE: 2500,    // Configurable target chunk size (2,000–3,000 chars)
  DEFAULT_CHUNK_OVERLAP: 250   // Configurable overlap (200–300 chars)
};

export class TextChunkerService {
  /**
   * Splits raw text into chunk strings respecting paragraph and word boundaries.
   */
  static chunkText(text, options = {}) {
    const chunkSize = options.chunkSize || CHUNK_CONFIG.DEFAULT_CHUNK_SIZE;
    const overlap = options.overlap || CHUNK_CONFIG.DEFAULT_CHUNK_OVERLAP;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return [];
    }

    const cleanText = text.trim();

    // If whole text fits in a single chunk, return immediately
    if (cleanText.length <= chunkSize) {
      return [cleanText];
    }

    const chunks = [];
    let start = 0;

    while (start < cleanText.length) {
      let end = start + chunkSize;

      if (end >= cleanText.length) {
        const finalChunk = cleanText.slice(start).trim();
        if (finalChunk.length > 0) {
          chunks.push(finalChunk);
        }
        break;
      }

      // Look for natural boundary (paragraph break \n\n, newline \n, sentence .!?, or space)
      let splitPos = -1;
      const lookbackWindow = Math.min(500, Math.floor(chunkSize / 2));
      const searchSub = cleanText.slice(end - lookbackWindow, end);

      const paraBreak = searchSub.lastIndexOf("\n\n");
      if (paraBreak !== -1) {
        splitPos = end - lookbackWindow + paraBreak + 2;
      } else {
        const newlineBreak = searchSub.lastIndexOf("\n");
        if (newlineBreak !== -1) {
          splitPos = end - lookbackWindow + newlineBreak + 1;
        } else {
          const sentenceBreak = searchSub.search(/[.!?]\s+[A-Z0-9]/);
          if (sentenceBreak !== -1) {
            splitPos = end - lookbackWindow + sentenceBreak + 2;
          } else {
            const spaceBreak = searchSub.lastIndexOf(" ");
            if (spaceBreak !== -1) {
              splitPos = end - lookbackWindow + spaceBreak + 1;
            }
          }
        }
      }

      if (splitPos === -1 || splitPos <= start) {
        splitPos = end;
      }

      const chunkContent = cleanText.slice(start, splitPos).trim();
      if (chunkContent.length > 0) {
        chunks.push(chunkContent);
      }

      // Calculate next start index with overlap
      const candidateStart = splitPos - overlap;
      if (candidateStart <= start) {
        start = splitPos;
      } else {
        // Adjust candidateStart to beginning of nearest word boundary so words are never cut on overlap
        let wordStart = candidateStart;
        while (
          wordStart > start &&
          cleanText[wordStart - 1] !== " " &&
          cleanText[wordStart - 1] !== "\n" &&
          cleanText[wordStart - 1] !== "\t"
        ) {
          wordStart--;
        }
        start = wordStart > start ? wordStart : candidateStart;
      }
    }

    return chunks;
  }

  /**
   * Transforms structured sections into chunk objects enriched with page and chapter metadata
   */
  static generateStructuredChunks({ bookId, sections, chunkSize, overlap }) {
    if (!Array.isArray(sections) || sections.length === 0) {
      return [];
    }

    const allChunks = [];
    let globalChunkIndex = 0;

    for (const sec of sections) {
      const textChunks = this.chunkText(sec.text, { chunkSize, overlap });

      for (const textChunk of textChunks) {
        allChunks.push({
          id: "chk_" + uuidv4().slice(0, 12),
          chunkId: "chk_" + uuidv4().slice(0, 12),
          bookId: bookId || null,
          book_id: bookId || null,
          chapter: sec.chapterTitle || "Chapter 1: Overview",
          section: sec.sectionTitle || "General Content",
          pageStart: sec.pageStart || 1,
          page_start: sec.pageStart || 1,
          pageEnd: sec.pageEnd || 1,
          page_end: sec.pageEnd || 1,
          chunkIndex: globalChunkIndex,
          chunk_index: globalChunkIndex,
          text: textChunk
        });
        globalChunkIndex++;
      }
    }

    return allChunks;
  }
}
