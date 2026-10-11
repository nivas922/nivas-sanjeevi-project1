import { Router } from "express";
import { QuizController } from "../controllers/quizController.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
import { validateGenerateQuiz, validateSubmitQuiz } from "../middleware/validation.js";

const router = Router();

router.post("/generate-quiz", aiRateLimiter, validateGenerateQuiz, QuizController.generateQuiz);
router.post("/submit-quiz", validateSubmitQuiz, QuizController.submitQuiz);
router.get("/quizzes", QuizController.getUserQuizzes);
router.get("/quizzes/:id", QuizController.getQuizById);

export default router;
