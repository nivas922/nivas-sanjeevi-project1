import { Router } from "express";
import { QuizController } from "../controllers/quizController.js";
import { authGuard } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
import { validateGenerateQuiz, validateSubmitQuiz } from "../middleware/validation.js";

const router = Router();

router.post("/generate-quiz", authGuard, aiRateLimiter, validateGenerateQuiz, QuizController.generateQuiz);
router.post("/submit-quiz", authGuard, validateSubmitQuiz, QuizController.submitQuiz);
router.get("/quizzes", authGuard, QuizController.getUserQuizzes);
router.get("/quizzes/:id", authGuard, QuizController.getQuizById);

export default router;
