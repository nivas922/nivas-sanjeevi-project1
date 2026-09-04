import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { authGuard } from "../middleware/auth.js";
import { otpRateLimiter } from "../middleware/rateLimiter.js";
import { validateGoogleAuth, validateSendOtp, validateVerifyOtp } from "../middleware/validation.js";

const router = Router();

router.post("/google", validateGoogleAuth, AuthController.googleAuth);
router.post("/mobile/send-otp", otpRateLimiter, validateSendOtp, AuthController.sendMobileOtp);
router.post("/mobile/verify-otp", otpRateLimiter, validateVerifyOtp, AuthController.verifyMobileOtp);
router.get("/me", authGuard, AuthController.getMe);

export default router;
