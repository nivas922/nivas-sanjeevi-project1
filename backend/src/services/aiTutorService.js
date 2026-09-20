import { env } from "../config/env.js";
import { Book } from "../models/Book.js";
import { DoubtRetrievalService } from "./doubtRetrievalService.js";
import { AiSummaryService } from "./aiSummaryService.js";

export class AiTutorService {
  /**
   * Primary backend service to answer student doubts using uploaded textbook chunks
   */
  static async answerDoubt({ bookId, question, userId, targetLanguage = "en" }) {
    console.log(`[AI-Tutor-Service] Solving doubt for bookId '${bookId}' (User: ${userId}): "${question}"`);

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey && env.NODE_ENV !== "test") {
      const err = new Error("AI tutor is currently unavailable. Please configure GEMINI_API_KEY in backend environment variables.");
      err.statusCode = 503;
      throw err;
    }

    if (!bookId) {
      const err = new Error("bookId is required.");
      err.statusCode = 400;
      throw err;
    }

    // 1. Verify Book existence & Student authorization
    const book = await Book.findById(bookId);
    if (!book) {
      const err = new Error("Textbook not found.");
      err.statusCode = 404;
      throw err;
    }

    if (book.user_id && book.user_id !== userId) {
      const err = new Error("You do not have authorization to access this textbook.");
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

    // 3. Retrieve relevant document chunks using DoubtRetrievalService
    const { chunks, hasRelevantContent } = await DoubtRetrievalService.retrieveRelevantChunks(bookId, question, 5);

    // 4. Hallucination Control: Return safe response if textbook lacks relevant content
    if (!hasRelevantContent || chunks.length === 0) {
      return {
        success: true,
        answer: "The uploaded textbook does not contain enough information to answer this question confidently.",
        hasRelevantContent: false,
        keyPoints: ["Information not present in uploaded textbook"],
        example: null,
        source: []
      };
    }

    // 5. Combine Chunks into Context Text with Metadata Markers
    const combinedChunksText = chunks
      .map(
        (c) =>
          `[Chunk ID: ${c.id}]\nChapter: ${c.chapter || "Overview"}\nSection: ${c.section || "General"}\nPages: ${c.pageStart || 1}-${c.pageEnd || 1}\nContent:\n${c.text}`
      )
      .join("\n\n---\n\n");

    // 6. Build Gemini Prompt
    const prompt = `You are an educational AI academic tutor answering a student's question based strictly on their uploaded textbook.

Textbook Title: ${book.title}
Subject: ${book.subject}
Target Language: ${targetLanguage}
Student Question: "${question}"

Supplied Textbook Context:
${combinedChunksText}

STRICT AI TUTOR RULES:
1. Answer using ONLY the supplied textbook context above. Do NOT invent facts or use external knowledge not present in the context.
2. If the textbook context does NOT contain enough information to answer the question, clearly state: "The uploaded textbook does not contain enough information to answer this question confidently."
3. Do not pretend external knowledge came from the textbook.
4. Explain in simple academic language appropriate for a student in target language '${targetLanguage}'.
5. Provide direct answer, key points, and an example ONLY if supported by the textbook context.
6. Include source metadata referencing the exact chapters, sections, page ranges, and chunk IDs used from the context.
7. Return ONLY a valid JSON object matching this schema:
{
  "answer": "Direct clear answer in target language...",
  "keyPoints": ["Key point 1", "Key point 2"],
  "example": "Code/Text example from textbook or null if none",
  "source": [
    {
      "chapter": "Chapter Name",
      "section": "Section Name",
      "pageStart": 1,
      "pageEnd": 5,
      "chunkId": "chk_1"
    }
  ]
}`;

    // 7. Call Gemini API with Retry
    const rawResponse = await AiSummaryService.callGeminiApiWithRetry(prompt);
    const parsedJSON = AiSummaryService.parseJsonFromGemini(rawResponse);

    if (parsedJSON && parsedJSON.answer) {
      const sources = Array.isArray(parsedJSON.source) && parsedJSON.source.length > 0
        ? parsedJSON.source
        : chunks.map((c) => ({
            chapter: c.chapter || "Overview",
            section: c.section || "General",
            pageStart: c.pageStart || 1,
            pageEnd: c.pageEnd || 1,
            chunkId: c.id
          }));

      return {
        success: true,
        answer: parsedJSON.answer,
        hasRelevantContent: true,
        keyPoints: Array.isArray(parsedJSON.keyPoints) ? parsedJSON.keyPoints : [],
        example: parsedJSON.example || null,
        source: sources
      };
    }

    // Fallback if structured parsing fails but text returned
    return {
      success: true,
      answer: rawResponse.slice(0, 1000),
      hasRelevantContent: true,
      keyPoints: [],
      example: null,
      source: chunks.map((c) => ({
        chapter: c.chapter || "Overview",
        section: c.section || "General",
        pageStart: c.pageStart || 1,
        pageEnd: c.pageEnd || 1,
        chunkId: c.id
      }))
    };
  }
}
