import { Router } from "express";
import { SummaryController } from "../controllers/summaryController.js";
import { authGuard } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
import { validateSummarize } from "../middleware/validation.js";

const router = Router();

router.post("/summarize", authGuard, aiRateLimiter, validateSummarize, SummaryController.summarize);
router.get("/summaries", authGuard, SummaryController.getUserSummaries);
router.get("/summaries/:id", authGuard, SummaryController.getSummaryById);
router.post("/summaries/:id/translate", authGuard, aiRateLimiter, SummaryController.translateExistingSummary);

export default router;
