import { Quiz } from "../models/Quiz.js";
import { Book } from "../models/Book.js";
import { Progress } from "../models/Progress.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { AiService } from "../services/aiService.js";
import { AdaptiveLearningService } from "../services/adaptiveLearningService.js";

export class QuizController {
  // POST /generate-quiz
  static async generateQuiz(req, res, next) {
    try {
      const { book_id, bookId, num_questions, questionCount, difficulty, language, target_language, topic, isAdaptive } = req.body;
      const targetBookId = book_id || bookId;
      const rawCount = num_questions ?? questionCount;
      const totalQuestions = rawCount !== undefined ? parseInt(rawCount, 10) : 5;
      const targetLang = language || target_language || req.user?.preferred_language || "en";

      if (!targetBookId) {
        return res.status(400).json({
          success: false,
          error: "book_id is required for AI quiz generation."
        });
      }

      if (isNaN(totalQuestions) || totalQuestions < 1 || totalQuestions > 30) {
        return res.status(400).json({
          success: false,
          error: "Question count must be an integer between 1 and 30."
        });
      }

      if (difficulty) {
        const allowedDiffs = ["easy", "medium", "hard", "beginner", "intermediate", "advanced"];
        if (typeof difficulty !== "string" || !allowedDiffs.includes(difficulty.trim().toLowerCase())) {
          return res.status(400).json({
            success: false,
            error: "Invalid difficulty level. Supported values: easy, medium, hard (or beginner, intermediate, advanced)."
          });
        }
      }

      const book = await Book.findById(targetBookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          error: `Textbook with ID '${targetBookId}' not found.`
        });
      }

      // Check textbook ownership (prevent cross-user IDOR)
      if (book.user_id && req.userId && book.user_id !== req.userId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: You do not have permission to generate a quiz for this textbook."
        });
      }

      const title = `${book.title} AI Mastery Quiz`;
      const subject = book.subject || "Academic Assessment";

      let finalDifficulty = difficulty;
      if (!finalDifficulty || isAdaptive) {
        finalDifficulty = await AdaptiveLearningService.getRecommendedDifficulty(req.userId, topic, targetBookId);
      }

      const generatedQuestions = await AiService.generateQuizQuestions({
        bookId: targetBookId,
        bookTitle: title,
        subject,
        numQuestions: totalQuestions,
        targetLanguage: targetLang,
        difficulty: finalDifficulty || "Intermediate"
      });

      const quiz = await Quiz.create({
        book_id: targetBookId,
        user_id: req.userId || null,
        num_questions: generatedQuestions.length,
        questions: generatedQuestions
      });

      return res.status(201).json({
        success: true,
        status: "success",
        message: "Quiz generated successfully.",
        quiz_id: quiz.id,
        quizId: quiz.id,
        quiz: {
          ...quiz,
          title,
          subject,
          topic: subject,
          difficulty: finalDifficulty || "Intermediate",
          totalQuestions: generatedQuestions.length,
          timeLimitMinutes: Math.max(5, Math.ceil(generatedQuestions.length * 1.5))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /submit-quiz
  static async submitQuiz(req, res, next) {
    try {
      const { quiz_id, quizId, answers, selectedAnswers } = req.body;
      const targetQuizId = quiz_id || quizId;
      const userAnswers = answers ?? selectedAnswers;

      if (!targetQuizId) {
        return res.status(400).json({ success: false, error: "quiz_id is required." });
      }

      if (userAnswers === undefined || userAnswers === null || typeof userAnswers !== "object") {
        return res.status(400).json({ success: false, error: "answers must be an object or array." });
      }

      const quiz = await Quiz.findById(targetQuizId);
      if (!quiz) {
        return res.status(404).json({ success: false, error: "Quiz not found." });
      }

      if (quiz.user_id && req.userId && quiz.user_id !== req.userId) {
        return res.status(403).json({ success: false, error: "You do not have authorization to submit this quiz." });
      }

      const questions = quiz.questions || [];
      let correctCount = 0;

      const reviewedAnswers = questions.map((q) => {
        let rawSelected;
        if (Array.isArray(userAnswers)) {
          const match = userAnswers.find((a) => a && (a.questionId === q.id || a.id === q.id));
          rawSelected = match ? (match.selectedAnswer ?? match.answer) : undefined;
        } else {
          rawSelected = userAnswers[q.id];
        }

        // Validate selected answer index strictly to prevent Number("") === 0 or Number(null) === 0 bugs
        let selectedIdx = null;
        let isCorrect = false;

        if (
          rawSelected !== undefined &&
          rawSelected !== null &&
          rawSelected !== "" &&
          rawSelected !== false
        ) {
          const parsed = Number(rawSelected);
          if (
            Number.isInteger(parsed) &&
            parsed >= 0 &&
            Array.isArray(q.options) &&
            parsed < q.options.length
          ) {
            selectedIdx = parsed;
            isCorrect = selectedIdx === Number(q.correctAnswer);
          }
        }

        if (isCorrect) correctCount += 1;

        return {
          questionId: q.id,
          question: q.question,
          userAnswerIndex: selectedIdx,
          userOption: selectedIdx !== null && q.options?.[selectedIdx] ? q.options[selectedIdx] : "No answer chosen",
          correctAnswerIndex: Number(q.correctAnswer),
          correctOption: q.options?.[q.correctAnswer],
          isCorrect,
          explanation: q.explanation,
          topic: q.topic || "Core Concept"
        };
      });

      const totalQuestions = questions.length || 1;
      const percentage = Math.round((correctCount / totalQuestions) * 100);

      let performanceLevel = "Weak";
      if (percentage >= 80) performanceLevel = "Strong";
      else if (percentage >= 65) performanceLevel = "Good";
      else if (percentage >= 50) performanceLevel = "Needs Improvement";

      // Save submission state to quiz record
      await Quiz.recordSubmission({
        id: quiz.id,
        score: correctCount,
        total_questions: totalQuestions,
        percentage,
        performance_level: performanceLevel,
        answers: reviewedAnswers
      });

      // Get associated subject
      let subjectName = "Computer Science & Engineering";
      if (quiz.book_id) {
        const book = await Book.findById(quiz.book_id);
        if (book) subjectName = book.subject;
      }

      // Update student's progress and average score
      await Progress.recordQuizScore(req.userId, subjectName, percentage);

      // Log activity
      await ActivityLog.create({
        user_id: req.userId,
        activity_type: "quiz",
        title: `Completed Quiz (${correctCount}/${totalQuestions} - ${percentage}%)`,
        reference_id: quiz.id
      });

      return res.status(200).json({
        success: true,
        status: "success",
        message: "Quiz submitted successfully.",
        quizId: quiz.id,
        score: correctCount,
        totalQuestions,
        percentage,
        performanceLevel,
        reviewedAnswers,
        answers: reviewedAnswers,
        recommendedTopic: percentage < 65 ? subjectName : "Advanced System Applications",
        recommendationDifficulty: percentage < 50 ? "Beginner" : percentage < 75 ? "Intermediate" : "Advanced"
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /quizzes
  static async getUserQuizzes(req, res, next) {
    try {
      const quizzes = await Quiz.findByUserId(req.userId);
      return res.status(200).json({
        success: true,
        status: "success",
        quizzes
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /quizzes/:id
  static async getQuizById(req, res, next) {
    try {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) {
        return res.status(404).json({ success: false, error: "Quiz not found." });
      }

      if (quiz.user_id && req.userId && quiz.user_id !== req.userId) {
        return res.status(403).json({ success: false, error: "You do not have authorization to access this quiz." });
      }

      return res.status(200).json({
        success: true,
        status: "success",
        quiz
      });
    } catch (error) {
      next(error);
    }
  }
}
