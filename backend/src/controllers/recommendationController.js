import { AdaptiveLearningService } from "../services/adaptiveLearningService.js";
import { Book } from "../models/Book.js";

export class RecommendationController {
  // GET /recommendations/:user_id
  static async getRecommendations(req, res, next) {
    try {
      const targetUserId = req.params.user_id || req.userId;
      const bookId = req.query.book_id || req.query.bookId || null;

      // Authorization check: User can only view their own recommendations
      if (req.userId && targetUserId !== req.userId) {
        return res.status(403).json({
          success: false,
          error: "You do not have authorization to view this user's recommendations."
        });
      }

      if (bookId) {
        const book = await Book.findById(bookId);
        if (book && book.user_id && book.user_id !== req.userId) {
          return res.status(403).json({
            success: false,
            error: "You do not have authorization to view recommendations for this textbook."
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
        recommendations
      });
    } catch (error) {
      next(error);
    }
  }
}
