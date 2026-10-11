import { Router } from "express";
import { RecommendationController } from "../controllers/recommendationController.js";

const router = Router();

// GET /recommendations & GET /recommendations/:user_id
router.get("/recommendations", RecommendationController.getRecommendations);
router.get("/recommendations/:user_id", RecommendationController.getRecommendations);

export default router;
