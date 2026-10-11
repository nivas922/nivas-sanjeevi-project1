import { Router } from "express";
import { DoubtController } from "../controllers/doubtController.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/ask-doubt", aiRateLimiter, DoubtController.askDoubt);

export default router;
