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
        hasRelevantContent: false,
        insufficientEvidence: true,
        confidence: "none",
        topScore: 0
      };
    }

    // 3. Score chunks based on keyword frequencies & metadata relevance
    const scoredChunks = [];
    const RELEVANCE_THRESHOLD = 3;

    for (const chunk of allChunks) {
      let score = 0;
      const textLower = (chunk.text || "").toLowerCase();
      const chapLower = (chunk.chapter || "").toLowerCase();
      const secLower = (chunk.section || "").toLowerCase();
      let matchedDistinctTokens = 0;

      for (const token of effectiveTokens) {
        const escaped = escapeRegExp(token);
        // Exact token occurrences in text
        const regex = new RegExp(`\\b${escaped}\\b`, "gi");
        const occurrences = (textLower.match(regex) || []).length;

        let tokenMatched = false;
        if (occurrences > 0) {
          score += occurrences * 3;
          tokenMatched = true;
        }

        // Word-boundary prefix match (min 4 chars to avoid false positives)
        if (occurrences === 0 && token.length >= 4) {
          const prefixRegex = new RegExp(`\\b${escaped}`, "gi");
          const prefixOccurrences = (textLower.match(prefixRegex) || []).length;
          if (prefixOccurrences > 0) {
            score += prefixOccurrences * 1;
            tokenMatched = true;
          }
        }

        // Chapter / Section title match bonus
        const titleRegex = new RegExp(`\\b${escaped}\\b`, "gi");
        if (titleRegex.test(chapLower) || titleRegex.test(secLower)) {
          score += 5;
          tokenMatched = true;
        }

        if (tokenMatched) {
          matchedDistinctTokens++;
        }
      }

      // Multi-term coverage bonus: if a chunk matches multiple query tokens, boost significantly
      if (effectiveTokens.length > 1 && matchedDistinctTokens > 1) {
        const coverageRatio = matchedDistinctTokens / effectiveTokens.length;
        score += Math.round(coverageRatio * 8);
      }

      if (score >= RELEVANCE_THRESHOLD) {
        scoredChunks.push({ chunk, score, matchedDistinctTokens });
      }
    }

    // 4. Rank by relevance score descending with deterministic tie-breaker
    scoredChunks.sort(
      (a, b) =>
        b.score - a.score ||
        ((a.chunk.chunkIndex ?? a.chunk.chunk_index ?? 0) - (b.chunk.chunkIndex ?? b.chunk.chunk_index ?? 0))
    );

    if (scoredChunks.length === 0) {
      return {
        chunks: [],
        hasRelevantContent: false,
        insufficientEvidence: true,
        confidence: "none",
        topScore: 0
      };
    }

    const topScore = scoredChunks[0].score;
    const topCoverage = scoredChunks[0].matchedDistinctTokens / effectiveTokens.length;
    let confidence = "low";
    if (topScore >= 12 && topCoverage >= 0.5) {
      confidence = "high";
    } else if (topScore >= 6) {
      confidence = "medium";
    }

    const selectedChunks = scoredChunks.slice(0, topK).map((sc) => sc.chunk);

    return {
      chunks: selectedChunks,
      hasRelevantContent: true,
      insufficientEvidence: false,
      confidence,
      topScore
    };
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
