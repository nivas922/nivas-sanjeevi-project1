import { DocumentChunk } from "../models/DocumentChunk.js";

export class DoubtRetrievalService {
  /**
   * Deterministic keyword search and relevance scoring over SQLite document_chunks for a specific bookId
   */
  static async retrieveRelevantChunks(bookId, question, topK = 5) {
    if (!bookId) {
      return { chunks: [], hasRelevantContent: false };
    }

    // 1. Fetch chunks STRICTLY for the specific book_id (User & Book Isolation)
    const allChunks = await DocumentChunk.findByBookId(bookId);
    if (!allChunks || allChunks.length === 0) {
      return { chunks: [], hasRelevantContent: false };
    }

    // 2. Tokenize question and remove common stop words
    const stopWords = new Set([
      "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
      "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
      "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
      "did", "do", "does", "doesn't", "doing", "don't", "down", "during", "each",
      "explain", "few", "for", "from", "further", "give", "had", "has", "have", "he",
      "how", "i", "if", "in", "into", "is", "isn't", "it", "its", "me", "more", "most",
      "my", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
      "our", "out", "over", "own", "same", "she", "should", "so", "some", "such",
      "than", "that", "the", "their", "theirs", "them", "then", "there", "these",
      "they", "this", "those", "through", "to", "too", "under", "until", "up",
      "very", "was", "we", "were", "what", "whatever", "when", "where", "which",
      "while", "who", "whom", "why", "with", "would", "you", "your"
    ]);

    const rawTokens = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);

    const tokens = rawTokens.filter((t) => !stopWords.has(t));
    const effectiveTokens = tokens.length > 0 ? tokens : rawTokens;

    if (effectiveTokens.length === 0) {
      return {
        chunks: [],
        hasRelevantContent: false
      };
    }

    // 3. Score chunks based on keyword frequencies & metadata relevance
    const scoredChunks = [];

    for (const chunk of allChunks) {
      let score = 0;
      const textLower = (chunk.text || "").toLowerCase();
      const chapLower = (chunk.chapter || "").toLowerCase();
      const secLower = (chunk.section || "").toLowerCase();

      for (const token of effectiveTokens) {
        // Exact token occurrences in text
        const regex = new RegExp(`\\b${escapeRegExp(token)}\\b`, "gi");
        const occurrences = (textLower.match(regex) || []).length;
        score += occurrences * 3;

        // Word-boundary prefix match (e.g. "connect" matching "connection", min 4 chars to avoid false positives like "ack" in "packets")
        if (occurrences === 0 && token.length >= 4) {
          const prefixRegex = new RegExp(`\\b${escapeRegExp(token)}`, "gi");
          const prefixOccurrences = (textLower.match(prefixRegex) || []).length;
          score += prefixOccurrences * 1;
        }

        // Chapter / Section title match bonus
        const titleRegex = new RegExp(`\\b${escapeRegExp(token)}\\b`, "gi");
        if (titleRegex.test(chapLower) || titleRegex.test(secLower)) {
          score += 5;
        }
      }

      if (score > 0) {
        scoredChunks.push({ chunk, score });
      }
    }

    // 4. Rank by relevance score descending with deterministic tie-breaker
    scoredChunks.sort(
      (a, b) =>
        b.score - a.score ||
        ((a.chunk.chunkIndex ?? a.chunk.chunk_index ?? 0) - (b.chunk.chunkIndex ?? b.chunk.chunk_index ?? 0))
    );

    if (scoredChunks.length === 0) {
      return { chunks: [], hasRelevantContent: false };
    }

    const selectedChunks = scoredChunks.slice(0, topK).map((sc) => sc.chunk);

    return {
      chunks: selectedChunks,
      hasRelevantContent: true
    };
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
