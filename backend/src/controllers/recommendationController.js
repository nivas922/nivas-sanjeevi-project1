import { AdaptiveLearningService } from "../services/adaptiveLearningService.js";
import { Book } from "../models/Book.js";
import { User } from "../models/User.js";

export class RecommendationController {
  // GET /recommendations or GET /recommendations/:user_id
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

      const user = await User.findById(targetUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found."
        });
      }

      if (bookId) {
        const book = await Book.findById(bookId);
        if (!book) {
          return res.status(404).json({
            success: false,
            error: "Textbook not found."
          });
        }
        if (book.user_id && book.user_id !== req.userId) {
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
        book_id: bookId,
        recommendations,
        insufficientHistory: recommendations.length === 0
      });
    } catch (error) {
      next(error);
    }
  }
}
