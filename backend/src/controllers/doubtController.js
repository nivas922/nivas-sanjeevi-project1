import { AiTutorService } from "../services/aiTutorService.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { DEFAULT_USER_ID, resolveAuthUserId } from "../middleware/auth.js";
import { isLanguageSupported, SUPPORTED_LANGUAGES } from "../config/languageConfig.js";

export class DoubtController {
  // POST /ask-doubt
  static async askDoubt(req, res, next) {
    const correlationId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      const body = req.body || {};
      const rawBookId = body.bookId !== undefined ? body.bookId : body.book_id;
      const targetBookId = typeof rawBookId === "string" ? rawBookId.trim() : (rawBookId ? String(rawBookId) : null);
      const question = typeof body.question === "string" ? body.question.trim() : "";
      const targetLang = typeof body.language === "string" ? body.language.trim() : (typeof body.target_language === "string" ? body.target_language.trim() : (req.user?.preferred_language || "en"));

      const idType = typeof rawBookId;
      const truncatedId = typeof targetBookId === "string" && targetBookId.length > 0
        ? (targetBookId.length > 12 ? `${targetBookId.slice(0, 12)}...` : targetBookId)
        : "none";

      console.log(`[AI-Tutor-Diagnostics] [${correlationId}] Request received: hasBookId=${Boolean(targetBookId)}, bookIdType=${idType}, truncatedId=${truncatedId}`);

      if (!targetBookId || targetBookId.length === 0) {
        console.log(`[AI-Tutor-Diagnostics] [${correlationId}] Validation failure: bookId is required. Status: 400`);
        return res.status(400).json({
          success: false,
          error: "bookId is required."
        });
      }

      if (!question || question.length === 0) {
        console.log(`[AI-Tutor-Diagnostics] [${correlationId}] Validation failure: question is required. Status: 400`);
        return res.status(400).json({
          success: false,
          error: "Please enter a question."
        });
      }

      if (question.length > 1000) {
        console.log(`[AI-Tutor-Diagnostics] [${correlationId}] Validation failure: question exceeds 1000 chars. Status: 400`);
        return res.status(400).json({
          success: false,
          error: "Question is too long (maximum 1000 characters)."
        });
      }

      if (targetLang && !isLanguageSupported(targetLang)) {
        console.log(`[AI-Tutor-Diagnostics] [${correlationId}] Validation failure: unsupported language. Status: 400`);
        return res.status(400).json({
          success: false,
          error: `Unsupported language: '${targetLang}'. Supported languages are: ${Object.keys(SUPPORTED_LANGUAGES).join(", ")}.`
        });
      }

      const conversationHistory = Array.isArray(body.conversationHistory)
        ? body.conversationHistory
        : Array.isArray(body.history)
        ? body.history
        : [];

      if (conversationHistory.length > 20) {
        console.log(`[AI-Tutor-Diagnostics] [${correlationId}] Validation failure: history too long. Status: 400`);
        return res.status(400).json({
          success: false,
          error: "Conversation history is too long (maximum 20 messages)."
        });
      }

      const currentUserId = resolveAuthUserId(req) || DEFAULT_USER_ID;

      const result = await AiTutorService.answerDoubt({
        bookId: targetBookId,
        question: question,
        userId: currentUserId,
        targetLanguage: targetLang,
        conversationHistory,
        correlationId
      });

      // Log activity
      await ActivityLog.create({
        user_id: currentUserId,
        activity_type: "doubt",
        title: `Asked AI Tutor: ${question.slice(0, 40)}`,
        reference_id: targetBookId
      });

      console.log(`[AI-Tutor-Diagnostics] [${correlationId}] Doubt successfully answered. Status: 200`);
      return res.status(200).json({
        success: true,
        status: "success",
        message: "Doubt answered successfully.",
        ...result
      });
    } catch (error) {
      const statusCode = error.statusCode || error.status || 500;
      console.log(`[AI-Tutor-Diagnostics] [${correlationId}] Request failed with status: ${statusCode}. Error: ${error.message}`);
      next(error);
    }
  }
}
