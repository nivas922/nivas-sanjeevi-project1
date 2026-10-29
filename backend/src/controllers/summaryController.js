import { Summary } from "../models/Summary.js";
import { Book } from "../models/Book.js";
import { Progress } from "../models/Progress.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { AiService } from "../services/aiService.js";
import { TtsService } from "../services/ttsService.js";
import { TranslationService } from "../services/translationService.js";
import { summarizationJobService } from "../services/summarizationJobService.js";
import { isLanguageSupported, SUPPORTED_LANGUAGES } from "../config/languageConfig.js";
import { DEFAULT_USER_ID, resolveAuthUserId, resolveAuthUser } from "../middleware/auth.js";

export class SummaryController {
  // POST /summarize
  static async summarize(req, res, next) {
    try {
      const { book_id, bookId } = req.body;
      const targetBookId = book_id || bookId;

      if (!targetBookId) {
        return res.status(400).json({ success: false, error: "book_id is required." });
      }

      // Resolve caller or fall back cleanly to default user
      const currentUser = await resolveAuthUser(req);
      const currentUserId = currentUser?.id || DEFAULT_USER_ID;

      // Read preferred_language from user profile if target_language is not explicitly given
      const rawTargetLang = req.body.target_language || req.body.language;
      if (rawTargetLang && !isLanguageSupported(rawTargetLang)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported target language: '${rawTargetLang}'. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(", ")}.`
        });
      }
      const targetLanguage = rawTargetLang || currentUser?.preferred_language || "en";

      const book = await Book.findById(targetBookId);
      if (!book) {
        return res.status(404).json({ success: false, error: "Book not found with provided ID." });
      }

      // 1. Reuse existing completed summary if already generated for this book and language
      const existingSummaries = await Summary.findByBookId(book.id);
      const existingSummary = existingSummaries.find(
        (s) => s.language === targetLanguage
      );

      if (existingSummary) {
        console.log(`[Summary-Controller] Reusing existing completed summary for book '${book.id}' (${targetLanguage})`);
        return res.status(200).json({
          success: true,
          status: "success",
          message: "Summary retrieved successfully from existing record.",
          summary_id: existingSummary.id,
          summaryId: existingSummary.id,
          language: targetLanguage,
          summary: {
            ...existingSummary,
            bookTitle: book.title,
            topic: book.title,
            audioUrl: existingSummary.audio_url || existingSummary.audioUrl
          }
        });
      }

      // 2. Run summarization job with in-flight deduplication and progress tracking
      const job = summarizationJobService.createOrGetJob(book.id, targetLanguage, async (updateProgress) => {
        updateProgress(20, "Generating hierarchical summaries");
        const aiResult = await AiService.generateSummary({
          bookId: book.id,
          bookTitle: book.title,
          subject: book.subject,
          text: "",
          targetLanguage
        });

        updateProgress(85, "Synthesizing multilingual audio");
        const ttsResult = await TtsService.synthesizeSpeech({
          text: aiResult.summaryText,
          language: targetLanguage
        });

        const quickRevisionPayload = {
          revisionPoints: aiResult.quickRevision || [],
          chapters: aiResult.chapters || [],
          pageSummaries: aiResult.pageSummaries || []
        };

        updateProgress(95, "Persisting summary to database");
        const summary = await Summary.create({
          book_id: book.id,
          user_id: currentUserId,
          language: targetLanguage,
          summary_text: aiResult.summaryText,
          key_concepts: aiResult.keyPoints || [],
          definitions: aiResult.definitions || [],
          formulas: aiResult.formulas || [],
          examples: aiResult.examples || [],
          quick_revision: quickRevisionPayload,
          audio_url: ttsResult.audioUrl
        });

        await Progress.incrementSummaryCount(currentUserId, book.subject);

        await ActivityLog.create({
          user_id: currentUserId,
          activity_type: "summary",
          title: `Generated Summary for '${book.title}' (${targetLanguage.toUpperCase()})`,
          reference_id: summary.id
        });

        return {
          ...summary,
          bookTitle: book.title,
          topic: book.title,
          simpleExplanation: aiResult.simpleExplanation,
          audioUrl: ttsResult.audioUrl,
          pageSummaries: aiResult.pageSummaries || summary.pageSummaries || []
        };
      });

      const summaryResult = await job.promise;

      return res.status(200).json({
        success: true,
        status: "success",
        message: "Summary generated successfully.",
        summary_id: summaryResult.id,
        summaryId: summaryResult.id,
        language: targetLanguage,
        summary: summaryResult
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /summarize/status/:bookId and GET /summaries/status/:bookId
  static async getSummarizeStatus(req, res, next) {
    try {
      const { bookId } = req.params;
      const rawTargetLang = req.query.target_language || req.query.language || "en";
      const targetLanguage = rawTargetLang.toLowerCase();

      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({ success: false, error: "Book not found." });
      }

      // Check SQLite database first
      const existingSummaries = await Summary.findByBookId(book.id);
      const existing = existingSummaries.find((s) => s.language === targetLanguage);
      if (existing) {
        return res.status(200).json({
          success: true,
          status: "completed",
          progress: 100,
          summary: {
            ...existing,
            bookTitle: book.title,
            topic: book.title,
            audioUrl: existing.audio_url || existing.audioUrl
          }
        });
      }

      // Check active job queue in memory
      const job = summarizationJobService.getJob(book.id, targetLanguage);
      if (job) {
        if (job.status === "completed" && job.result) {
          return res.status(200).json({
            success: true,
            status: "completed",
            progress: 100,
            summary: job.result
          });
        }
        if (job.status === "failed") {
          return res.status(200).json({
            success: false,
            status: "failed",
            progress: job.progress,
            error: job.error
          });
        }
        return res.status(200).json({
          success: true,
          status: "processing",
          progress: job.progress,
          stage: job.stage
        });
      }

      return res.status(404).json({
        success: false,
        status: "not_found",
        message: "No summarization job in progress or completed for this book."
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /summaries
  static async getUserSummaries(req, res, next) {
    try {
      const summaries = req.userId && req.userId !== "usr_default"
        ? await Summary.findByUserId(req.userId)
        : await Summary.findAll();
      return res.status(200).json({
        success: true,
        status: "success",
        summaries: summaries.length > 0 ? summaries : await Summary.findAll()
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
      const rawTargetLang = req.body.target_language || req.body.language;
      if (rawTargetLang && !isLanguageSupported(rawTargetLang)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported target language: '${rawTargetLang}'. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(", ")}.`
        });
      }
      const targetLang = rawTargetLang || req.user?.preferred_language || "ta";

      let summary = await Summary.findById(summaryId);
      if (!summary && req.body.summary) {
        summary = req.body.summary;
      }
      if (!summary && req.body.text) {
        summary = {
          id: summaryId,
          summaryText: req.body.text,
          summary_text: req.body.text,
          topic: req.body.topic || "Textbook Summary"
        };
      }
      if (!summary) {
        return res.status(404).json({ success: false, error: "Summary not found." });
      }

      const translated = await TranslationService.translateSummaryObject(summary, targetLang);

      return res.status(200).json({
        success: true,
        status: "success",
        language: targetLang,
        translation: translated
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /summaries/:id
  static async deleteSummary(req, res, next) {
    try {
      const summaryId = req.params.id;
      if (!summaryId || typeof summaryId !== "string" || !summaryId.trim()) {
        return res.status(400).json({ success: false, error: "Invalid summary ID." });
      }

      const summary = await Summary.findById(summaryId);
      if (!summary) {
        return res.status(404).json({ success: false, error: "Summary not found." });
      }

      // Authorization: only the owner or default user can delete
      const ownerId = summary.user_id || summary.userId;
      if (ownerId && ownerId !== DEFAULT_USER_ID) {
        const authUserId = resolveAuthUserId(req);
        if (!authUserId) {
          return res.status(401).json({
            success: false,
            error: "Authentication token required to delete this summary."
          });
        }
        if (authUserId !== ownerId) {
          return res.status(403).json({
            success: false,
            error: "Access denied. You do not have permission to delete this summary."
          });
        }
      }

      await Summary.deleteById(summaryId);

      return res.status(200).json({
        success: true,
        status: "success",
        message: "Summary deleted successfully."
      });
    } catch (error) {
      next(error);
    }
  }
}
