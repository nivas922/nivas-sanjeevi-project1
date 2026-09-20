import { Progress } from "../models/Progress.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { User } from "../models/User.js";
import { Book } from "../models/Book.js";
import { AdaptiveLearningService } from "../services/adaptiveLearningService.js";

export class ProgressController {
  // GET /progress/:user_id
  static async getProgress(req, res, next) {
    try {
      const targetUserId = req.params.user_id || req.userId;

      // Authorization check: prevent reading other user's progress
      if (req.userId && targetUserId !== req.userId) {
        return res.status(403).json({ success: false, error: "You do not have authorization to view this user's progress." });
      }

      const user = await User.findById(targetUserId);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found." });
      }

      const aggregate = await Progress.getAggregateForUser(targetUserId);

      // Color themes for UI display
      const colors = [
        { color: "bg-brand-500", text: "text-brand-700", bgLight: "bg-brand-50" },
        { color: "bg-emerald-500", text: "text-emerald-700", bgLight: "bg-emerald-50" },
        { color: "bg-purple-500", text: "text-purple-700", bgLight: "bg-purple-50" },
        { color: "bg-amber-500", text: "text-amber-700", bgLight: "bg-amber-50" },
        { color: "bg-rose-500", text: "text-rose-700", bgLight: "bg-rose-50" }
      ];

      const themedSubjects = (aggregate.subject_progress || []).map((sub, idx) => {
        const theme = colors[idx % colors.length];
        return {
          ...sub,
          progress: Math.min(100, (sub.summaries_count * 25) + Math.round(sub.average_score * 0.5)),
          color: theme.color,
          text: theme.text,
          bgLight: theme.bgLight
        };
      });

      return res.status(200).json({
        success: true,
        status: "success",
        user_id: targetUserId,
        stats: {
          booksStudied: aggregate.books_studied_count,
          books_studied_count: aggregate.books_studied_count,
          summariesGenerated: aggregate.summaries_count,
          summaries_count: aggregate.summaries_count,
          quizzesCompleted: aggregate.quizzes_taken,
          quizzes_taken: aggregate.quizzes_taken,
          averageScore: aggregate.average_score,
          average_score: aggregate.average_score
        },
        subjectProgress: themedSubjects,
        subject_progress: themedSubjects
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /activity/:user_id
  static async getActivity(req, res, next) {
    try {
      const targetUserId = req.params.user_id || req.userId;

      // Authorization check
      if (req.userId && targetUserId !== req.userId) {
        return res.status(403).json({ success: false, error: "You do not have authorization to view this user's activity log." });
      }

      const user = await User.findById(targetUserId);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found." });
      }

      const activities = await ActivityLog.findByUserId(targetUserId, 20);

      return res.status(200).json({
        success: true,
        status: "success",
        user_id: targetUserId,
        activities
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /adaptive-learning/:bookId or GET /adaptive-learning
  static async getAdaptiveLearning(req, res, next) {
    try {
      const targetUserId = req.userId;
      const bookId = req.params.bookId || req.query.book_id || req.query.bookId || null;

      if (bookId) {
        const book = await Book.findById(bookId);
        if (!book) {
          return res.status(404).json({ success: false, error: "Textbook not found." });
        }
        if (book.user_id && book.user_id !== targetUserId) {
          return res.status(403).json({ success: false, error: "You do not have authorization to access adaptive learning for this textbook." });
        }
      }

      const dashboard = await AdaptiveLearningService.getAdaptiveDashboard(targetUserId, bookId);

      return res.status(200).json({
        success: true,
        status: "success",
        user_id: targetUserId,
        book_id: bookId,
        ...dashboard
      });
    } catch (error) {
      next(error);
    }
  }
}
