import { AuthService } from "../services/authService.js";
import { User } from "../models/User.js";

export class AuthController {
  // POST /auth/google
  static async googleAuth(req, res, next) {
    try {
      const { email, name, avatar, picture, department } = req.body;
      const result = await AuthService.handleGoogleAuth({
        email,
        name,
        picture: picture || avatar,
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
      next(error);
    }
  }

  // POST /auth/mobile/send-otp
  static async sendMobileOtp(req, res, next) {
    try {
      const { mobile } = req.body;
      const result = await AuthService.sendMobileOtp(mobile);

      return res.status(200).json({
        success: true,
        status: "success",
        message: "OTP sent successfully to mobile number.",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /auth/mobile/verify-otp
  static async verifyMobileOtp(req, res, next) {
    try {
      const { mobile, otp, department } = req.body;
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
      return res.status(400).json({
        success: false,
        error: error.message || "Invalid or expired OTP."
      });
    }
  }

  // GET /auth/me (Protected)
  static async getMe(req, res, next) {
    try {
      const user = await User.findById(req.userId);
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
