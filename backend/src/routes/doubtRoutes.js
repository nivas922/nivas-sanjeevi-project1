import { Router } from "express";
import { DoubtController } from "../controllers/doubtController.js";
import { authGuard } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/ask-doubt", authGuard, aiRateLimiter, DoubtController.askDoubt);

export default router;
