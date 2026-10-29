import { Progress } from "../models/Progress.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { User } from "../models/User.js";
import { Book } from "../models/Book.js";
import { Quiz } from "../models/Quiz.js";
import { StudySession } from "../models/StudySession.js";
import { AdaptiveLearningService } from "../services/adaptiveLearningService.js";
import { DEFAULT_USER_ID, resolveAuthUserId } from "../middleware/auth.js";

export class ProgressController {
  // GET /progress & GET /progress/:user_id
  static async getProgress(req, res, next) {
    try {
      const authUserId = resolveAuthUserId(req);
      const requestedUserId = req.params.user_id;

      let targetUserId;
      if (!requestedUserId || requestedUserId === DEFAULT_USER_ID) {
        targetUserId = authUserId || DEFAULT_USER_ID;
      } else {
        // A specific private user ID was requested.
        // Prevent unauthorized snooping on private student records:
        if (authUserId !== requestedUserId) {
          return res.status(403).json({
            success: false,
            error: "Forbidden: Cannot access another student's private progress records."
          });
        }
        targetUserId = requestedUserId;
      }

      let user = await User.findById(targetUserId);
      if (!user) {
        user = await User.getDefaultUser();
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

      // Real quiz attempts from SQLite database
      const quizzes = await Quiz.findByUserId(targetUserId);
      const submittedQuizzes = (quizzes || [])
        .filter((q) => q.score !== null && q.score !== undefined)
        .sort((a, b) => new Date(a.taken_at || 0) - new Date(b.taken_at || 0));

      const quizHistory = submittedQuizzes.map((q) => ({
        id: q.id,
        quizId: q.id,
        percentage: q.percentage || 0,
        score: q.score || 0,
        totalQuestions: q.totalQuestions || 0,
        performanceLevel: q.performanceLevel,
        takenAt: q.taken_at,
        bookId: q.book_id
      }));

      // Calculate real score trend from chronological quiz history
      let scoreTrend = null;
      let scoreTrendPositive = true;
      if (quizHistory.length >= 2) {
        const delta = quizHistory[quizHistory.length - 1].percentage - quizHistory[0].percentage;
        scoreTrend = delta >= 0 ? `+${delta}%` : `${delta}%`;
        scoreTrendPositive = delta >= 0;
      }

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
          average_score: aggregate.average_score,
          scoreTrend,
          scoreTrendPositive
        },
        subjectProgress: themedSubjects,
        subject_progress: themedSubjects,
        quizHistory,
        quiz_history: quizHistory
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /activity & GET /activity/:user_id
  static async getActivity(req, res, next) {
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
            error: "Forbidden: Cannot access another student's private activity log."
          });
        }
        targetUserId = requestedUserId;
      }

      let user = await User.findById(targetUserId);
      if (!user) {
        user = await User.getDefaultUser();
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
      const authUserId = resolveAuthUserId(req);
      const targetUserId = authUserId || DEFAULT_USER_ID;
      const bookId = req.params.bookId || req.query.book_id || req.query.bookId || null;

      if (bookId) {
        const book = await Book.findById(bookId);
        if (!book) {
          return res.status(404).json({ success: false, error: "Textbook not found." });
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

  // GET /adaptive-learning/analytics & GET /adaptive-learning/analytics/:user_id
  static async getLearningAnalytics(req, res, next) {
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
            error: "Forbidden: Cannot access another student's learning analytics."
          });
        }
        targetUserId = requestedUserId;
      }

      const bookId = req.query.book_id || req.query.bookId || null;
      if (bookId) {
        const book = await Book.findById(bookId);
        if (!book) {
          return res.status(404).json({ success: false, error: "Textbook not found." });
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

  // POST /study-sessions
  static async recordStudySession(req, res, next) {
    try {
      const authUserId = resolveAuthUserId(req) || DEFAULT_USER_ID;
      const { activity_type, activityType, duration_seconds, durationSeconds, date } = req.body;
      const finalType = activity_type || activityType || "summary";
      const finalSecs = parseInt(duration_seconds ?? durationSeconds, 10);
      const finalDate = date || new Date().toISOString().split("T")[0];

      if (isNaN(finalSecs) || finalSecs <= 0) {
        return res.status(400).json({
          success: false,
          error: "duration_seconds must be a positive integer"
        });
      }

      const session = await StudySession.create({
        user_id: authUserId,
        activity_type: finalType,
        duration_seconds: finalSecs,
        date: finalDate
      });

      return res.status(201).json({
        success: true,
        status: "success",
        session
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /study-sessions
  static async getStudySessions(req, res, next) {
    try {
      const authUserId = resolveAuthUserId(req) || DEFAULT_USER_ID;
      const localDate = req.query.date || new Date().toISOString().split("T")[0];
      const stats = await StudySession.getStats(authUserId, localDate);

      return res.status(200).json({
        success: true,
        status: "success",
        user_id: authUserId,
        date: localDate,
        ...stats
      });
    } catch (error) {
      next(error);
    }
  }
}

