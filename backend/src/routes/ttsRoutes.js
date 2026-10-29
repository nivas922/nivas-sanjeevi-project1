import { Router } from "express";
import { TtsController } from "../controllers/ttsController.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
import { validateTTS } from "../middleware/validation.js";

const router = Router();

router.post("/text-to-speech", aiRateLimiter, validateTTS, TtsController.synthesize);
router.post("/tts/synthesize", aiRateLimiter, validateTTS, TtsController.synthesize);

export default router;
