import { Router } from "express";
import { ProfileController } from "../controllers/profileController.js";
import { uploadAvatarMiddleware } from "../middleware/upload.js";
import { validateProfile } from "../middleware/validation.js";

const router = Router();

// GET /profile - Get public student profile
router.get("/profile", ProfileController.getProfile);

// PUT /profile - Update public student preferences
router.put("/profile", uploadAvatarMiddleware, validateProfile, ProfileController.updateProfile);

export default router;
