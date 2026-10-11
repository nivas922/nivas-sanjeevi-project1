import { Router } from "express";
import { ProgressController } from "../controllers/progressController.js";

const router = Router();

// GET /progress & GET /progress/:user_id
router.get("/progress", ProgressController.getProgress);
router.get("/progress/:user_id", ProgressController.getProgress);

// GET /activity & GET /activity/:user_id
router.get("/activity", ProgressController.getActivity);
router.get("/activity/:user_id", ProgressController.getActivity);

// GET /adaptive-learning & GET /adaptive-learning/:bookId
router.get("/adaptive-learning", ProgressController.getAdaptiveLearning);
router.get("/adaptive-learning/:bookId", ProgressController.getAdaptiveLearning);

export default router;
