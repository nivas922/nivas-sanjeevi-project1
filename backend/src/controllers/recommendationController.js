import { AdaptiveLearningService } from "../services/adaptiveLearningService.js";
import { Book } from "../models/Book.js";
import { User } from "../models/User.js";
import { DEFAULT_USER_ID, resolveAuthUserId } from "../middleware/auth.js";

export class RecommendationController {
  // GET /recommendations or GET /recommendations/:user_id
  static async getRecommendations(req, res, next) {
    try {
      const authUserId = resolveAuthUserId(req);
      const requestedUserId = req.params.user_id;

      let targetUserId;
      if (!requestedUserId || requestedUserId === DEFAULT_USER_ID) {
        targetUserId = authUserId || DEFAULT_USER_ID;
      } else {
        if (authUserId !== requestedUserId) {
          return res.status(403).json({
            success: false,
            error: "Forbidden: Cannot access another student's private recommendations."
          });
        }
        targetUserId = requestedUserId;
      }

      const bookId = req.query.book_id || req.query.bookId || null;
      if (bookId) {
        const book = await Book.findById(bookId);
        if (!book) {
          return res.status(404).json({
            success: false,
            error: "Textbook not found."
          });
        }
      }

      const recommendations = await AdaptiveLearningService.generatePersonalizedRecommendations(
        targetUserId,
        bookId
      );

      return res.status(200).json({
        success: true,
        status: "success",
        user_id: targetUserId,
        book_id: bookId,
        recommendations,
        insufficientHistory: recommendations.length === 0
      });
    } catch (error) {
      next(error);
    }
  }
}
