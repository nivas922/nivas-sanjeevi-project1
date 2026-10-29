import { Quiz } from "../models/Quiz.js";
import { Book } from "../models/Book.js";
import { Progress } from "../models/Progress.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { AiService } from "../services/aiService.js";
import { AdaptiveLearningService } from "../services/adaptiveLearningService.js";
import { DEFAULT_USER_ID, resolveAuthUserId, resolveAuthUser } from "../middleware/auth.js";

export class QuizController {
  // POST /generate-quiz
  static async generateQuiz(req, res, next) {
    try {
      const { book_id, bookId, num_questions, questionCount, difficulty, language, target_language, topic, isAdaptive } = req.body;
      const targetBookId = book_id || bookId;
      const rawCount = num_questions ?? questionCount;
      const totalQuestions = rawCount !== undefined ? parseInt(rawCount, 10) : 5;
      const currentUser = await resolveAuthUser(req);
      const currentUserId = currentUser?.id || DEFAULT_USER_ID;
      const targetLang = language || target_language || currentUser?.preferred_language || "en";

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

      const title = `${book.title} AI Mastery Quiz`;
      const subject = book.subject || "Academic Assessment";

      let finalDifficulty = difficulty;
      if (!finalDifficulty || isAdaptive) {
        finalDifficulty = await AdaptiveLearningService.getRecommendedDifficulty(currentUserId, topic, targetBookId);
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
        user_id: currentUserId,
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
      const {
        quiz_id,
        quizId,
        answers,
        selectedAnswers,
        topic: reqTopic,
        subject: reqSubject,
        quizTitle: reqTitle,
        timeSpentSeconds: reqTimeSpent,
        summaryId: reqSummaryId,
        bookId: reqBookId
      } = req.body;
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

      // Get associated subject and topic
      let subjectName = reqSubject || "General Studies";
      let bookTitle = "";
      if (quiz.book_id) {
        const book = await Book.findById(quiz.book_id);
        if (book) {
          subjectName = book.subject || book.title || subjectName;
          bookTitle = book.title || "";
        }
      }

      const currentUserId = resolveAuthUserId(req) || DEFAULT_USER_ID;

      // Update student's progress and average score
      await Progress.recordQuizScore(currentUserId, subjectName, percentage);

      // Log activity
      await ActivityLog.create({
        user_id: currentUserId,
        activity_type: "quiz",
        title: `Completed Quiz (${correctCount}/${totalQuestions} - ${percentage}%)`,
        reference_id: quiz.id
      });

      // Identify primary topic and weak topics from answers
      const missedQuestions = reviewedAnswers.filter(
        (a) => !a.isCorrect && a.topic && a.topic !== "Core Concept" && a.topic.toLowerCase() !== "undefined"
      );
      const questionWithTopic = questions.find(
        (q) => q.topic && q.topic !== "Core Concept" && q.topic.toLowerCase() !== "undefined"
      );

      const isValidTopic = (t) => t && typeof t === "string" && t.trim() && t.trim().toLowerCase() !== "undefined";

      const identifiedTopic = isValidTopic(reqTopic)
        ? reqTopic.trim()
        : (percentage < 80 && missedQuestions.length > 0 && isValidTopic(missedQuestions[0].topic))
        ? missedQuestions[0].topic.trim()
        : isValidTopic(questionWithTopic?.topic)
        ? questionWithTopic.topic.trim()
        : isValidTopic(questions[0]?.topic)
        ? questions[0].topic.trim()
        : isValidTopic(subjectName)
        ? subjectName.trim()
        : "General Review";

      const targetRecommendationTopic = percentage < 65 ? identifiedTopic : `${identifiedTopic} Advanced Applications`;

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
        recommendedTopic: targetRecommendationTopic,
        recommendationDifficulty: percentage < 50 ? "Beginner" : percentage < 75 ? "Intermediate" : "Advanced",
        topic: identifiedTopic,
        subject: subjectName,
        quizTitle: reqTitle || (bookTitle ? `${bookTitle} Quiz` : `${identifiedTopic} Quiz`),
        timeSpentSeconds: reqTimeSpent || 120,
        bookId: quiz.book_id || reqBookId || null,
        summaryId: reqSummaryId || null
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /quizzes
  static async getUserQuizzes(req, res, next) {
    try {
      const authUserId = resolveAuthUserId(req);
      const quizzes = authUserId && authUserId !== "usr_default"
        ? await Quiz.findByUserId(authUserId)
        : await Quiz.findAll();
      return res.status(200).json({
        success: true,
        status: "success",
        quizzes: quizzes.length > 0 ? quizzes : await Quiz.findAll()
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
