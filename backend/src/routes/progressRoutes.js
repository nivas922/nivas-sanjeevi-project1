import { Router } from "express";
import { ProgressController } from "../controllers/progressController.js";
import { authGuard } from "../middleware/auth.js";

const router = Router();

// GET /progress/:user_id
router.get("/progress/:user_id", authGuard, ProgressController.getProgress);

// GET /activity/:user_id
router.get("/activity/:user_id", authGuard, ProgressController.getActivity);

// GET /adaptive-learning & GET /adaptive-learning/:bookId
router.get("/adaptive-learning", authGuard, ProgressController.getAdaptiveLearning);
router.get("/adaptive-learning/:bookId", authGuard, ProgressController.getAdaptiveLearning);

export default router;
