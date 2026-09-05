import { Router } from "express";
import { ProgressController } from "../controllers/progressController.js";
import { authGuard } from "../middleware/auth.js";

const router = Router();

// GET /progress/:user_id
router.get("/progress/:user_id", authGuard, ProgressController.getProgress);

// GET /activity/:user_id
router.get("/activity/:user_id", authGuard, ProgressController.getActivity);

export default router;
