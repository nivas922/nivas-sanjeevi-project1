import { Quiz } from "../models/Quiz.js";
import { Book } from "../models/Book.js";
import { Progress } from "../models/Progress.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { AiService } from "../services/aiService.js";

export class QuizController {
  // POST /generate-quiz
  static async generateQuiz(req, res, next) {
    try {
      const { book_id, bookId, num_questions, questionCount } = req.body;
      const targetBookId = book_id || bookId;
      const totalQuestions = parseInt(num_questions || questionCount || 5, 10);
      const language = req.body.language || req.user?.preferred_language || "en";

      let subject = "Computer Science & Engineering";
      let title = "Academic Knowledge Assessment";

      if (targetBookId) {
        const book = await Book.findById(targetBookId);
        if (book) {
          subject = book.subject;
          title = `${book.title} AI Mastery Quiz`;
        }
      }

      const generatedQuestions = await AiService.generateQuizQuestions({
        bookTitle: title,
        subject,
        numQuestions: totalQuestions,
        targetLanguage: language
      });

      const quiz = await Quiz.create({
        book_id: targetBookId || null,
        user_id: req.userId,
        num_questions: generatedQuestions.length,
        questions: generatedQuestions
      });

      // Sanitized questions for client (keep correctAnswer for offline verification if needed by frontend)
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
      const userAnswers = answers || selectedAnswers || {};

      if (!targetQuizId) {
        return res.status(400).json({ success: false, error: "quiz_id is required." });
      }

      const quiz = await Quiz.findById(targetQuizId);
      if (!quiz) {
        return res.status(404).json({ success: false, error: "Quiz not found." });
      }

      const questions = quiz.questions || [];
      let correctCount = 0;

      const reviewedAnswers = questions.map((q) => {
        const selected = Array.isArray(userAnswers)
          ? userAnswers.find((a) => a.questionId === q.id)?.selectedAnswer
          : userAnswers[q.id];

        const isCorrect = Number(selected) === Number(q.correctAnswer);
        if (isCorrect) correctCount += 1;

        return {
          questionId: q.id,
          question: q.question,
          userAnswerIndex: selected !== undefined ? Number(selected) : null,
          userOption: selected !== undefined ? q.options?.[selected] : "No answer chosen",
          correctAnswerIndex: q.correctAnswer,
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
