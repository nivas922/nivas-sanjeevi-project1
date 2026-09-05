import { Router } from "express";
import { RecommendationController } from "../controllers/recommendationController.js";
import { authGuard } from "../middleware/auth.js";

const router = Router();

// GET /recommendations/:user_id
router.get("/recommendations/:user_id", authGuard, RecommendationController.getRecommendations);

export default router;
