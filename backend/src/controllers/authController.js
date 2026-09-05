import { AuthService } from "../services/authService.js";
import { User } from "../models/User.js";

export class AuthController {
  // POST /auth/google
  static async googleAuth(req, res, next) {
    try {
      const id_token = req.body.id_token || req.body.credential || req.body.token;
      const { department } = req.body;

      if (!id_token) {
        return res.status(401).json({
          success: false,
          error: "Google verification failed: missing id_token"
        });
      }

      const result = await AuthService.handleGoogleAuth({
        id_token,
        department
      });

      return res.status(200).json({
        success: true,
        status: "success",
        token: result.token,
        user: result.user,
        isNewUser: result.isNewUser
      });
    } catch (error) {
      const status = error.statusCode || 401;
      return res.status(status).json({
        success: false,
        error: error.message || "Google verification failed."
      });
    }
  }

  // POST /auth/mobile/send-otp
  static async sendMobileOtp(req, res, next) {
    try {
      const mobile = req.body.mobile || req.body.mobile_number;
      const result = await AuthService.sendMobileOtp(mobile);

      return res.status(200).json({
        success: true,
        status: "success",
        message: "Verification code dispatched to your mobile number.",
        data: result
      });
    } catch (error) {
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Failed to dispatch mobile OTP."
      });
    }
  }

  // POST /auth/mobile/verify-otp
  static async verifyMobileOtp(req, res, next) {
    try {
      const mobile = req.body.mobile || req.body.mobile_number;
      const { otp, department } = req.body;
      const result = await AuthService.verifyMobileOtp(mobile, otp, department);

      return res.status(200).json({
        success: true,
        status: "success",
        message: "Mobile verification successful.",
        token: result.token,
        user: result.user,
        isNewUser: result.isNewUser
      });
    } catch (error) {
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Invalid or expired verification code."
      });
    }
  }

  // POST /auth/email/signup
  static async emailSignup(req, res, next) {
    try {
      const { name, email, password, department } = req.body;
      const result = await AuthService.emailSignup({ name, email, password, department });

      return res.status(201).json({
        success: true,
        status: "success",
        ...result
      });
    } catch (error) {
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Registration failed."
      });
    }
  }

  // POST /auth/email/verify
  static async emailVerify(req, res, next) {
    try {
      const { email, otp } = req.body;
      const result = await AuthService.emailVerify({ email, otp });

      return res.status(200).json({
        success: true,
        status: "success",
        ...result
      });
    } catch (error) {
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Email verification failed."
      });
    }
  }

  // POST /auth/email/login
  static async emailLogin(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.emailLogin({ email, password });

      return res.status(200).json({
        success: true,
        status: "success",
        message: "Signed in successfully.",
        token: result.token,
        user: result.user
      });
    } catch (error) {
      const status = error.statusCode || 401;
      return res.status(status).json({
        success: false,
        error: error.message || "Authentication failed.",
        emailNotVerified: Boolean(error.emailNotVerified),
        email: error.email
      });
    }
  }

  // POST /auth/email/resend-otp
  static async resendEmailOtp(req, res, next) {
    try {
      const { email } = req.body;
      const result = await AuthService.resendEmailOtp(email);

      return res.status(200).json({
        success: true,
        status: "success",
        message: "A fresh verification code has been dispatched to your email.",
        data: result
      });
    } catch (error) {
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Failed to resend verification code."
      });
    }
  }

  // POST /auth/forgot-password
  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);

      return res.status(200).json({
        success: true,
        status: "success",
        ...result
      });
    } catch (error) {
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Failed to process password reset request."
      });
    }
  }

  // POST /auth/reset-password
  static async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword, password } = req.body;
      const result = await AuthService.resetPassword({
        email,
        otp,
        newPassword: newPassword || password
      });

      return res.status(200).json({
        success: true,
        status: "success",
        ...result
      });
    } catch (error) {
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        error: error.message || "Password reset failed."
      });
    }
  }

  // GET /auth/me (Protected)
  static async getMe(req, res, next) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found."
        });
      }
      return res.status(200).json({
        success: true,
        status: "success",
        user
      });
    } catch (error) {
      next(error);
    }
  }
}
