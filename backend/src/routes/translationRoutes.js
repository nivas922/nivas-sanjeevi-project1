import { Router } from "express";
import { TranslationController } from "../controllers/translationController.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// POST /translate
router.post("/translate", aiRateLimiter, TranslationController.translateText);

export default router;
