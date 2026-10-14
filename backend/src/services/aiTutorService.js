import { env } from "../config/env.js";
import { Book } from "../models/Book.js";
import { DoubtRetrievalService } from "./doubtRetrievalService.js";
import { AiSummaryService } from "./aiSummaryService.js";
import { getLanguageConfig } from "../config/languageConfig.js";
import { DEFAULT_USER_ID } from "../middleware/auth.js";

export class AiTutorService {
  /**
   * Primary backend service to answer student doubts using uploaded textbook chunks
   */
  static async answerDoubt({ bookId, question, userId, targetLanguage = "en", conversationHistory = [], correlationId = null }) {
    const trimmedBookId = typeof bookId === "string" ? bookId.trim() : (bookId ? String(bookId) : null);
    const truncatedId = typeof trimmedBookId === "string" && trimmedBookId.length > 0
      ? (trimmedBookId.length > 12 ? `${trimmedBookId.slice(0, 12)}...` : trimmedBookId)
      : "unknown";

    console.log(`[AI-Tutor-Diagnostics] [${correlationId || "service"}] Processing doubt: bookId=${truncatedId}, user=${userId || "default"}`);

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey && (env.NODE_ENV !== "test" || process.env.NODE_ENV !== "test")) {
      const err = new Error("AI tutor is currently unavailable. Please configure GEMINI_API_KEY in backend environment variables.");
      err.statusCode = 503;
      throw err;
    }

    if (!trimmedBookId || trimmedBookId.length === 0) {
      const err = new Error("bookId is required.");
      err.statusCode = 400;
      throw err;
    }

    // 1. Verify Book existence in SQLite database
    const book = await Book.findById(trimmedBookId);
    console.log(`[AI-Tutor-Diagnostics] [${correlationId || "service"}] Book lookup: model=Book, table=books, db=learnai.db, truncatedId=${truncatedId}, found=${Boolean(book)}`);

    if (!book) {
      const err = new Error("Textbook not found.");
      err.statusCode = 404;
      throw err;
    }

    // 1b. Check User Authorization / Ownership
    // Default demo books (user_id === DEFAULT_USER_ID) are accessible to all users.
    // User-uploaded books with specific user_id are only accessible by that user.
    const effectiveUserId = userId || DEFAULT_USER_ID;
    if (book.user_id && book.user_id !== DEFAULT_USER_ID && effectiveUserId !== book.user_id) {
      console.log(`[AI-Tutor-Diagnostics] [${correlationId || "service"}] Access denied: book belongs to another user. Status: 403`);
      const err = new Error("Access denied. You do not have permission to access this textbook.");
      err.statusCode = 403;
      throw err;
    }

    // 2. Validate Question
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      const err = new Error("Please enter a question.");
      err.statusCode = 400;
      throw err;
    }

    if (question.trim().length > 1000) {
      const err = new Error("Question is too long (maximum 1000 characters).");
      err.statusCode = 400;
      throw err;
    }

    // 3. Sanitize and bound conversation history (max 4 turns to avoid context overflow)
    const sanitizedHistory = Array.isArray(conversationHistory)
      ? conversationHistory
          .slice(-4)
          .map((m) => ({
            role: m.role === "assistant" || m.role === "ai" || m.role === "model" ? "assistant" : "user",
            text: String(m.text || m.content || "").slice(0, 500).trim()
          }))
          .filter((m) => m.text.length > 0)
      : [];

    // 4. Retrieve relevant document chunks using DoubtRetrievalService (always re-retrieve for latest question)
    const retrieval = await DoubtRetrievalService.retrieveRelevantChunks(bookId, question.trim(), 5);
    const { chunks = [], hasRelevantContent = false, confidence = "none", insufficientEvidence = true } = retrieval;

    // 5. Hallucination Control: Return safe response if textbook lacks relevant content
    if (!hasRelevantContent || chunks.length === 0) {
      return {
        success: true,
        status: "success",
        answer: "The uploaded textbook does not contain enough information to answer this question confidently.",
        hasRelevantContent: false,
        insufficientEvidence: true,
        confidence: "none",
        keyPoints: ["Information not present in uploaded textbook"],
        example: null,
        source: [],
        sources: [],
        followUpSuggestions: []
      };
    }

    // 6. Combine Chunks into Context Text with Metadata Markers
    const combinedChunksText = chunks
      .map(
        (c) =>
          `[Chunk ID: ${c.id}]\nChapter: ${c.chapter || "Overview"}\nSection: ${c.section || "General"}\nPages: ${c.pageStart || c.page_start || 1}-${c.pageEnd || c.page_end || 1}\nContent:\n${c.text}`
      )
      .join("\n\n---\n\n");

    const langConfig = getLanguageConfig(targetLanguage);
    const targetLangDisplay = langConfig ? `${langConfig.name} (${langConfig.nativeName})` : targetLanguage;

    const historyPromptSection = sanitizedHistory.length > 0
      ? `Recent Conversation Context (for continuity only; all factual answers must come strictly from the passages):\n` +
        sanitizedHistory.map((h) => `${h.role === "assistant" ? "AI Tutor" : "Student"}: ${h.text}`).join("\n") +
        "\n\n"
      : "";

    // 7. Build Gemini Prompt
    const prompt = `You are an educational AI academic tutor answering a student's question based strictly on their uploaded textbook.

Textbook Title: ${book.title}
Subject: ${book.subject}
Target Language: ${targetLangDisplay}
${historyPromptSection}Student Question: "${question.trim()}"

Supplied Textbook Passages:
${combinedChunksText}

STRICT AI TUTOR RULES:
1. Answer using ONLY the supplied textbook passages above. Do NOT invent facts or use external knowledge not present in the passages.
2. Explain concepts in simple, student-friendly academic language in target language '${targetLangDisplay}'.
3. Preserve the textbook's technical terminology precisely.
4. Use examples ONLY when directly supported by the passages or clearly label them as illustrative.
5. Never invent textbook facts, chapter names, quotations, or page references.
6. If the supplied textbook passages do NOT contain enough information to answer the question, clearly state:
   "The uploaded textbook does not contain enough information to answer this question confidently."
   and set "insufficientEvidence" to true and "confidence" to "none".
7. Provide 2-3 relevant follow-up questions in "followUpSuggestions" directly related to the supplied passages.
8. Return ONLY a valid JSON object matching this schema:
{
  "answer": "Clear explanation grounded strictly in the textbook passages...",
  "keyPoints": ["Key point 1", "Key point 2"],
  "example": "Passage example or null if none",
  "confidence": "high",
  "insufficientEvidence": false,
  "followUpSuggestions": ["Follow-up question 1?", "Follow-up question 2?"],
  "source": [
    {
      "chunkId": "exact chunk id from supplied passages",
      "chapter": "exact chapter name",
      "section": "exact section name",
      "pageStart": 1,
      "pageEnd": 5
    }
  ]
}`;

    // 8. Call Gemini API with Retry
    const rawResponse = await AiSummaryService.callGeminiApiWithRetry(prompt);
    const parsedJSON = AiSummaryService.parseJsonFromGemini(rawResponse);

    if (!parsedJSON || !parsedJSON.answer || typeof parsedJSON.answer !== "string") {
      const err = new Error("AI tutor returned an unparseable response format. Please try asking again.");
      err.statusCode = 502;
      throw err;
    }

    // 9. Source Citation Validation (Filter out hallucinated citations)
    const chunkMap = new Map(chunks.map((c) => [c.id, c]));
    let validatedSources = [];
    const rawSources = Array.isArray(parsedJSON.source)
      ? parsedJSON.source
      : Array.isArray(parsedJSON.sources)
      ? parsedJSON.sources
      : [];

    if (rawSources.length > 0) {
      validatedSources = rawSources
        .map((s) => {
          if (!s) return null;
          const matchingChunk = chunkMap.get(s.chunkId);
          if (matchingChunk) {
            return {
              chunkId: matchingChunk.id,
              chapter: matchingChunk.chapter || s.chapter || "Overview",
              section: matchingChunk.section || s.section || "General",
              pageStart: matchingChunk.pageStart || matchingChunk.page_start || s.pageStart || 1,
              pageEnd: matchingChunk.pageEnd || matchingChunk.page_end || s.pageEnd || 1
            };
          }
          return null;
        })
        .filter(Boolean);
    }

    // Fallback: If AI didn't provide specific chunkId match but answered, use top retrieved chunks
    if (validatedSources.length === 0) {
      validatedSources = chunks.slice(0, 3).map((c) => ({
        chunkId: c.id,
        chapter: c.chapter || "Overview",
        section: c.section || "General",
        pageStart: c.pageStart || c.page_start || 1,
        pageEnd: c.pageEnd || c.page_end || 1
      }));
    }

    const isAnswerInsufficient =
      parsedJSON.insufficientEvidence === true ||
      parsedJSON.answer.includes("does not contain enough information") ||
      retrieval.insufficientEvidence === true;

    const finalConfidence = isAnswerInsufficient
      ? "none"
      : parsedJSON.confidence || retrieval.confidence || "high";

    const followUpSuggestions = Array.isArray(parsedJSON.followUpSuggestions)
      ? parsedJSON.followUpSuggestions.filter((s) => typeof s === "string" && s.trim().length > 0)
      : [];

    return {
      success: true,
      status: "success",
      answer: parsedJSON.answer,
      hasRelevantContent: !isAnswerInsufficient,
      insufficientEvidence: isAnswerInsufficient,
      confidence: finalConfidence,
      keyPoints: Array.isArray(parsedJSON.keyPoints) ? parsedJSON.keyPoints : [],
      example: parsedJSON.example || null,
      source: isAnswerInsufficient ? [] : validatedSources,
      sources: isAnswerInsufficient ? [] : validatedSources,
      followUpSuggestions: isAnswerInsufficient ? [] : followUpSuggestions
    };
  }
}
