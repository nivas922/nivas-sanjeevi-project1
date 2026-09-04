import { Router } from "express";
import { TtsController } from "../controllers/ttsController.js";
import { authGuard } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
import { validateTTS } from "../middleware/validation.js";

const router = Router();

router.post("/text-to-speech", authGuard, aiRateLimiter, validateTTS, TtsController.synthesize);

export default router;
