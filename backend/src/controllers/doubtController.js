import { AiTutorService } from "../services/aiTutorService.js";
import { ActivityLog } from "../models/ActivityLog.js";

export class DoubtController {
  // POST /ask-doubt
  static async askDoubt(req, res, next) {
    try {
      const body = req.body || {};
      const targetBookId = body.bookId || body.book_id;
      const question = body.question;
      const targetLang = typeof body.language === "string" ? body.language : (typeof body.target_language === "string" ? body.target_language : (req.user?.preferred_language || "en"));

      if (!targetBookId || typeof targetBookId !== "string" || targetBookId.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "bookId is required."
        });
      }

      if (!question || typeof question !== "string" || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Please enter a question."
        });
      }

      if (question.trim().length > 1000) {
        return res.status(400).json({
          success: false,
          error: "Question is too long (maximum 1000 characters)."
        });
      }

      const result = await AiTutorService.answerDoubt({
        bookId: targetBookId,
        question: question.trim(),
        userId: req.userId,
        targetLanguage: targetLang
      });

      // Log activity
      if (req.userId) {
        await ActivityLog.create({
          user_id: req.userId,
          activity_type: "doubt",
          title: `Asked AI Tutor: ${question.trim().slice(0, 40)}`,
          reference_id: targetBookId
        });
      }

      return res.status(200).json({
        success: true,
        status: "success",
        message: "Doubt answered successfully.",
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}
