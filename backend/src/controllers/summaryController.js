import { Summary } from "../models/Summary.js";
import { Book } from "../models/Book.js";
import { Progress } from "../models/Progress.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { AiService } from "../services/aiService.js";
import { TtsService } from "../services/ttsService.js";
import { TranslationService } from "../services/translationService.js";

export class SummaryController {
  // POST /summarize
  static async summarize(req, res, next) {
    try {
      const { book_id, bookId } = req.body;
      const targetBookId = book_id || bookId;

      if (!targetBookId) {
        return res.status(400).json({ success: false, error: "book_id is required." });
      }

      // Read preferred_language from user profile if target_language is not explicitly given
      const targetLanguage = req.body.target_language || req.body.language || req.user.preferred_language || "en";

      const book = await Book.findById(targetBookId);
      if (!book) {
        return res.status(404).json({ success: false, error: "Book not found with provided ID." });
      }

      // Generate multilingual AI summary
      const aiResult = await AiService.generateSummary({
        bookTitle: book.title,
        subject: book.subject,
        text: book.extractedText || "",
        targetLanguage
      });

      // Synthesize audio preview for TTS integration
      const ttsResult = await TtsService.synthesizeSpeech({
        text: aiResult.summaryText,
        language: targetLanguage
      });

      // Save summary to database
      const summary = await Summary.create({
        book_id: book.id,
        user_id: req.userId,
        language: targetLanguage,
        summary_text: aiResult.summaryText,
        key_concepts: aiResult.keyPoints || [],
        definitions: aiResult.definitions || [],
        formulas: aiResult.formulas || [],
        examples: aiResult.examples || [],
        quick_revision: aiResult.quickRevision || [],
        audio_url: ttsResult.audioUrl
      });

      // Update progress for user & subject
      await Progress.incrementSummaryCount(req.userId, book.subject);

      // Log activity
      await ActivityLog.create({
        user_id: req.userId,
        activity_type: "summary",
        title: `Generated Summary for '${book.title}' (${targetLanguage.toUpperCase()})`,
        reference_id: summary.id
      });

      return res.status(200).json({
        success: true,
        status: "success",
        message: "Summary generated successfully.",
        summary_id: summary.id,
        summaryId: summary.id,
        language: targetLanguage,
        summary: {
          ...summary,
          bookTitle: book.title,
          topic: book.title,
          simpleExplanation: aiResult.simpleExplanation,
          audioUrl: ttsResult.audioUrl
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /summaries
  static async getUserSummaries(req, res, next) {
    try {
      const summaries = await Summary.findByUserId(req.userId);
      return res.status(200).json({
        success: true,
        status: "success",
        summaries
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /summaries/:id
  static async getSummaryById(req, res, next) {
    try {
      const summary = await Summary.findById(req.params.id);
      if (!summary) {
        return res.status(404).json({ success: false, error: "Summary not found." });
      }
      return res.status(200).json({
        success: true,
        status: "success",
        summary
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /summaries/:id/translate
  static async translateExistingSummary(req, res, next) {
    try {
      const summaryId = req.params.id;
      const targetLang = req.body.target_language || req.body.language || req.user.preferred_language || "ta";

      const summary = await Summary.findById(summaryId);
      if (!summary) {
        return res.status(404).json({ success: false, error: "Summary not found." });
      }

      const book = await Book.findById(summary.book_id);
      const localized = TranslationService.getLocalizedSummaryData(targetLang, book ? book.title : "Textbook");

      return res.status(200).json({
        success: true,
        status: "success",
        language: targetLang,
        translation: {
          summaryText: localized.summaryText,
          simpleExplanation: localized.simpleExplanation,
          keyPoints: localized.keyPoints,
          definitions: localized.definitions
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
