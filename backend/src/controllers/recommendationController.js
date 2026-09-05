import { Progress } from "../models/Progress.js";
import { Quiz } from "../models/Quiz.js";
import { Book } from "../models/Book.js";

export class RecommendationController {
  // GET /recommendations/:user_id
  static async getRecommendations(req, res, next) {
    try {
      const targetUserId = req.params.user_id || req.userId;
      const progressList = await Progress.findByUserId(targetUserId);
      const quizzes = await Quiz.findByUserId(targetUserId);
      const books = await Book.findByUserId(targetUserId);

      // New users with no study data have no generated recommendations
      if (progressList.length === 0 && books.length === 0) {
        return res.status(200).json({
          success: true,
          status: "success",
          user_id: targetUserId,
          recommendations: []
        });
      }

      const recommendations = [];

      // 1. Analyze recent quiz attempts
      if (quizzes.length > 0) {
        const lastQuiz = quizzes[0];
        if (lastQuiz.percentage < 60) {
          recommendations.push({
            id: `rec-quiz-${lastQuiz.id}`,
            topic: `${lastQuiz.questions?.[0]?.topic || "Core Fundamentals"} - Foundations`,
            subject: "Academic Revision",
            reason: `Your recent quiz score was ${lastQuiz.percentage}%. System recommends reviewing fundamental definitions and concepts.`,
            recommendedDifficulty: "Beginner",
            estimatedMinutes: 8,
            actionType: "summary",
            targetQuizId: lastQuiz.id,
            urgency: "High",
            badge: "Weak Topic Detected"
          });
        } else if (lastQuiz.percentage >= 80) {
          recommendations.push({
            id: `rec-adv-${lastQuiz.id}`,
            topic: `${lastQuiz.questions?.[0]?.topic || "Advanced Systems"} - Mastery Applications`,
            subject: "Level Up",
            reason: `Great score of ${lastQuiz.percentage}%! System unlocked advanced problem-solving challenges.`,
            recommendedDifficulty: "Advanced",
            estimatedMinutes: 12,
            actionType: "quiz",
            targetQuizId: lastQuiz.id,
            urgency: "Low",
            badge: "Level Up"
          });
        }
      }

      // 2. Analyze subject progress
      for (const prog of progressList) {
        if (prog.summaries_count > 0 && prog.quizzes_taken === 0) {
          recommendations.push({
            id: `rec-prog-${prog.id}`,
            topic: `${prog.subject} Knowledge Assessment`,
            subject: prog.subject,
            reason: `You generated summaries for ${prog.subject}. Test your understanding with a diagnostic quiz.`,
            recommendedDifficulty: "Intermediate",
            estimatedMinutes: 10,
            actionType: "quiz",
            urgency: "Medium",
            badge: "Quiz Ready"
          });
        }
      }

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
