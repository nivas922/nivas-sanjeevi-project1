import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { authGuard } from "../middleware/auth.js";
import { otpRateLimiter } from "../middleware/rateLimiter.js";
import {
  validateGoogleAuth,
  validateSendOtp,
  validateVerifyOtp,
  validateEmailSignup,
  validateEmailVerify,
  validateEmailLogin,
  validateForgotPassword,
  validateResetPassword
} from "../middleware/validation.js";

const router = Router();

// 1. Google OAuth 2.0
router.post("/google", validateGoogleAuth, AuthController.googleAuth);

// 2. Mobile Number OTP System
router.post("/mobile/send-otp", otpRateLimiter, validateSendOtp, AuthController.sendMobileOtp);
router.post("/mobile/verify-otp", otpRateLimiter, validateVerifyOtp, AuthController.verifyMobileOtp);

// 3. Email Authentication (Signup, Verification OTP, Password Login)
router.post("/email/signup", validateEmailSignup, AuthController.emailSignup);
router.post("/email/verify", validateEmailVerify, AuthController.emailVerify);
router.post("/email/login", validateEmailLogin, AuthController.emailLogin);
router.post("/email/resend-otp", otpRateLimiter, validateForgotPassword, AuthController.resendEmailOtp);

// 4. Password Recovery
router.post("/forgot-password", otpRateLimiter, validateForgotPassword, AuthController.forgotPassword);
router.post("/reset-password", validateResetPassword, AuthController.resetPassword);

// 5. Protected User Profile
router.get("/me", authGuard, AuthController.getMe);

export default router;
