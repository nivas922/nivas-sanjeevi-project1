import { env } from "../config/env.js";
import { TranslationService } from "./translationService.js";
import { AiSummaryService } from "./aiSummaryService.js";
import { QuizGenService } from "./quizGenService.js";
import { Book } from "../models/Book.js";


export class AiService {
  // 1. AI Summarization using Phase 3 Gemini Pipeline
  static async generateSummary({ bookId, bookTitle, subject, text, targetLanguage = "en" }) {
    console.log(`[AI-Service] Generating Phase 3 Gemini summary for '${bookTitle}' (ID: ${bookId}) in language '${targetLanguage}'`);

    const apiKey = env.GEMINI_API_KEY;

    // Check if API key is present
    if (!apiKey && env.NODE_ENV !== "test") {
      const err = new Error("AI summarization is currently unavailable. Please configure GEMINI_API_KEY in backend environment variables.");
      err.statusCode = 530;
      throw err;
    }

    if (!bookId) {
      const err = new Error("bookId is required for AI summarization.");
      err.statusCode = 400;
      throw err;
    }

    const fullResult = await AiSummaryService.summarizeBookFromChunks({
      bookId,
      bookTitle,
      subject,
      targetLanguage
    });

    return {
      summaryText: fullResult.overallSummary,
      language: targetLanguage,
      keyPoints: fullResult.keyPoints,
      definitions: fullResult.definitions,
      formulas: fullResult.formulas,
      examples: fullResult.examples,
      quickRevision: fullResult.quickRevision,
      chapters: fullResult.chapters
    };
  }


  // 2. Dynamic Textbook AI Quiz Generation using Gemini
  static async generateQuizQuestions({ bookId, bookTitle, subject, numQuestions = 5, targetLanguage = "en", difficulty = "Intermediate" }) {
    console.log(`[AI-Service] Generating ${numQuestions} AI quiz questions for bookId '${bookId || bookTitle}' in '${targetLanguage}'`);

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

    return await QuizGenService.generateQuizFromBook({
      bookId,
      questionCount: numQuestions,
      difficulty,
      targetLanguage
    });
  }
}

