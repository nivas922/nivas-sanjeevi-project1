import { Router } from "express";
import { ProfileController } from "../controllers/profileController.js";
import { authGuard } from "../middleware/auth.js";
import { uploadAvatarMiddleware } from "../middleware/upload.js";
import { validateProfile } from "../middleware/validation.js";

const router = Router();

// PUT /profile
router.put("/profile", authGuard, uploadAvatarMiddleware, validateProfile, ProfileController.updateProfile);

export default router;
