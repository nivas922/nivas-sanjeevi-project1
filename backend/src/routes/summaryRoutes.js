import { Router } from "express";
import { SummaryController } from "../controllers/summaryController.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
import { validateSummarize, validateTranslateSummary } from "../middleware/validation.js";

const router = Router();

router.post("/summarize", aiRateLimiter, validateSummarize, SummaryController.summarize);
router.get("/summaries", SummaryController.getUserSummaries);
router.get("/summaries/:id", SummaryController.getSummaryById);
router.post("/summaries/:id/translate", aiRateLimiter, validateTranslateSummary, SummaryController.translateExistingSummary);

export default router;
