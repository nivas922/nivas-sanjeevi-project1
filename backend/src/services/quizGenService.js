import { env } from "../config/env.js";
import { DocumentChunk } from "../models/DocumentChunk.js";
import { Summary } from "../models/Summary.js";
import { Book } from "../models/Book.js";
import { AiSummaryService } from "./aiSummaryService.js";

export class QuizGenService {
  /**
   * Core function to generate textbook-specific MCQs using Gemini
   */
  static async generateQuizFromBook({ bookId, questionCount = 5, difficulty = "Intermediate", targetLanguage = "en" }) {
    console.log(`[Quiz-Gen-Service] Generating ${questionCount} questions for bookId '${bookId}' in '${targetLanguage}'`);

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey && env.NODE_ENV !== "test") {
      const err = new Error("AI quiz generation is currently unavailable. Please configure GEMINI_API_KEY in backend environment variables.");
      err.statusCode = 530;
      throw err;
    }

    if (!bookId) {
      const err = new Error("bookId is required for AI quiz generation.");
      err.statusCode = 400;
      throw err;
    }

    // 1. Retrieve Textbook
    const book = await Book.findById(bookId);
    if (!book) {
      const err = new Error(`Book with id '${bookId}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Retrieve Phase 2 Chunks & Phase 3 Summaries
    const chunks = await DocumentChunk.findByBookId(bookId);
    const existingSummary = await Summary.findByBookId(bookId);

    let sourceContentText = "";

    if (chunks && chunks.length > 0) {
      // Controlled content selection: sample up to 10 chunks evenly across document
      const sampleSize = Math.min(chunks.length, 10);
      const step = chunks.length / sampleSize;
      const selectedChunks = [];
      for (let i = 0; i < sampleSize; i++) {
        const idx = Math.floor(i * step);
        selectedChunks.push(chunks[idx]);
      }

      sourceContentText = selectedChunks
        .map(
          (c) =>
            `[Chapter: ${c.chapter || "Overview"} | Section: ${c.section || "General"} | Pages: ${c.pageStart || 1}-${c.pageEnd || 1}]\n${c.text.slice(0, 1000)}`
        )
        .join("\n\n---\n\n");
    } else if (existingSummary && existingSummary.summaryText) {
      sourceContentText = `Overall Summary:\n${existingSummary.summaryText}\n\nKey Points:\n${(existingSummary.keyPoints || []).join("\n")}`;
    } else if (book.extractedText) {
      sourceContentText = book.extractedText.slice(0, 8000);
    } else {
      const err = new Error(`No extracted text or document chunks found for book '${book.title}'. Please upload a valid document.`);
      err.statusCode = 400;
      throw err;
    }

    const requestedCount = Math.max(1, Math.min(30, parseInt(questionCount, 10) || 5));

    // 3. Build Prompt for Gemini
    const prompt = `You are an expert academic professor. Generate an adaptive Multiple Choice Question (MCQ) quiz based ONLY on the provided textbook content.

Textbook Title: ${book.title}
Subject: ${book.subject}
Target Language: ${targetLanguage}
Requested Question Count: ${requestedCount}
Target Difficulty: ${difficulty}

Source Content from Textbook:
${sourceContentText}

STRICT QUESTION GENERATION RULES:
1. Questions MUST come ONLY from the supplied textbook content above. Do NOT invent textbook facts or use unrelated general knowledge.
2. Do NOT repeat questions. Every question must be distinct.
3. Each question MUST have exactly four (4) distinct options.
4. Exactly ONE option must be correct. Specify "correctAnswer" as an integer index (0 for 1st option, 1 for 2nd, 2 for 3rd, 3 for 4th).
5. Provide a clear, detailed academic explanation for why the answer is correct based on the text.
6. Include metadata for each question: topic, difficulty ("easy", "medium", or "hard"), chapter, section, and sourcePages if present in the text.
7. Preserve technical terminology.
8. Return ONLY a valid JSON object strictly matching this schema:
{
  "questions": [
    {
      "question": "Clear question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Clear academic explanation based on textbook...",
      "topic": "Topic Name",
      "difficulty": "medium",
      "chapter": "Chapter 1",
      "section": "1.1",
      "sourcePages": "1-5"
    }
  ]
}`;

    // 4. Call Gemini with retry
    let validQuestions = [];
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts && validQuestions.length < requestedCount) {
      attempts++;
      try {
        const rawResponse = await AiSummaryService.callGeminiApiWithRetry(prompt);
        const parsedJSON = AiSummaryService.parseJsonFromGemini(rawResponse);

        if (parsedJSON && Array.isArray(parsedJSON.questions)) {
          const sanitized = this.validateAndSanitizeQuestions(parsedJSON.questions, book);
          validQuestions = this.deduplicateQuestions([...validQuestions, ...sanitized]);
        }
      } catch (err) {
        console.warn(`[QuizGenService] Gemini attempt ${attempts} warning:`, err.message);
        if (attempts >= maxAttempts && validQuestions.length === 0) {
          throw err;
        }
      }
    }

    if (validQuestions.length === 0) {
      const err = new Error("Failed to generate valid quiz questions from the textbook content. Please try again.");
      err.statusCode = 500;
      throw err;
    }

    // Return requested number of questions with unique IDs
    const finalQuestions = validQuestions.slice(0, requestedCount).map((q, idx) => ({
      ...q,
      id: `q-${Date.now()}-${idx + 1}`
    }));

    return finalQuestions;
  }

  /**
   * Validate and sanitize output questions from Gemini
   */
  static validateAndSanitizeQuestions(rawQuestions, book) {
    if (!Array.isArray(rawQuestions)) return [];

    const valid = [];
    for (const q of rawQuestions) {
      if (!q || typeof q !== "object") continue;

      // 1. Question text validation
      if (!q.question || typeof q.question !== "string" || q.question.trim().length < 5) {
        continue;
      }

      // 2. Options validation (must be array of exactly 4 non-empty distinct options)
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        continue;
      }
      const hasEmptyOption = q.options.some((opt) => !opt || typeof opt !== "string" || opt.trim().length === 0);
      if (hasEmptyOption) continue;

      const uniqueOpts = new Set(q.options.map((o) => o.trim().toLowerCase()));
      if (uniqueOpts.size !== 4) {
        // Discard questions containing duplicate options
        continue;
      }

      // 3. Correct answer index validation (0..3 integer, with safe letter "A".."D" repair)
      let correctIdx = q.correctAnswer;
      if (typeof correctIdx === "string") {
        const trimmed = correctIdx.trim().toUpperCase();
        if (["A", "B", "C", "D"].includes(trimmed)) {
          correctIdx = { A: 0, B: 1, C: 2, D: 3 }[trimmed];
        } else {
          correctIdx = Number(trimmed);
        }
      } else {
        correctIdx = Number(correctIdx);
      }

      if (isNaN(correctIdx) || !Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx > 3) {
        continue;
      }

      // 4. Explanation validation
      if (!q.explanation || typeof q.explanation !== "string" || q.explanation.trim().length < 3) {
        continue;
      }

      let diff = (q.difficulty || "medium").toString().toLowerCase();
      if (diff === "beginner") diff = "easy";
      else if (diff === "intermediate") diff = "medium";
      else if (diff === "advanced") diff = "hard";
      else if (!["easy", "medium", "hard"].includes(diff)) {
        diff = "medium";
      }

      valid.push({
        question: q.question.trim(),
        options: q.options.map((opt) => opt.trim()),
        correctAnswer: correctIdx,
        explanation: q.explanation.trim(),
        topic: (q.topic || book.subject || book.title || "Core Concepts").toString().trim(),
        difficulty: diff,
        chapter: (q.chapter || "Chapter 1").toString().trim(),
        section: (q.section || "1.1").toString().trim(),
        sourcePages: (q.sourcePages || "1-5").toString().trim(),
        bookId: book.id,
        book_id: book.id
      });
    }

    return valid;
  }

  /**
   * Normalize question text and remove duplicate questions
   */
  static deduplicateQuestions(questions) {
    const seen = new Set();
    const result = [];

    for (const q of questions) {
      const normalized = q.question.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(q);
      }
    }

    return result;
  }
}
