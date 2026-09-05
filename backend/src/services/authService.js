import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { OtpService } from "./otpService.js";
import { generateToken } from "../middleware/auth.js";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID || undefined);

export class AuthService {
  // 1. Real Google OAuth Token Verification & Login
  static async handleGoogleAuth({ id_token, department = "Computer Science & Engineering (CSE)" }) {
    if (!id_token || typeof id_token !== "string" || id_token.trim().length === 0) {
      const err = new Error("Google verification failed: missing or empty id_token.");
      err.statusCode = 401;
      throw err;
    }

    let payload;
    try {
      // In test mode or when testing tokens:
      if ((env.NODE_ENV === "test" || process.env.NODE_ENV === "test") && id_token.startsWith("mock_valid_google_token_")) {
        const email = id_token.replace("mock_valid_google_token_", "");
        payload = {
          email,
          name: email.split("@")[0].toUpperCase(),
          sub: "google_uid_" + email.replace(/[^a-zA-Z0-9]/g, ""),
          picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`
        };
      } else {
        const ticket = await googleClient.verifyIdToken({
          idToken: id_token,
          audience: env.GOOGLE_CLIENT_ID || undefined
        });
        payload = ticket.getPayload();
      }
    } catch (verifyErr) {
      const err = new Error(`Google verification failed: ${verifyErr.message || "Invalid ID token"}`);
      err.statusCode = 401;
      throw err;
    }

    if (!payload || !payload.email) {
      const err = new Error("Google verification failed: token did not contain a valid email.");
      err.statusCode = 401;
      throw err;
    }

    const { email, name, picture, sub: googleId } = payload;
    const normalizedEmail = email.toLowerCase().trim();

    let user = await User.findByEmail(normalizedEmail);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const id = "usr_" + uuidv4().slice(0, 12);
      const safeName = name || normalizedEmail.split("@")[0].toUpperCase();
      const profilePic = picture || `https://api.dicebear.com/7.x/bottts/svg?seed=google_${encodeURIComponent(safeName)}`;

      user = await User.create({
        id,
        name: safeName,
        email: normalizedEmail,
        email_verified: 1,
        google_id: googleId,
        login_method: "google",
        profile_pic_url: profilePic,
        role: department,
        preferred_language: "en"
      });
    } else {
      // Update Google ID and ensure email is marked verified
      await User.update(user.id, {
        google_id: googleId,
        email_verified: 1,
        ...(picture ? { profile_pic_url: picture } : {})
      });
      user = await User.findById(user.id);
    }

    const token = generateToken(user);
    return {
      token,
      user,
      isNewUser
    };
  }

  // 2. Send Mobile OTP
  static async sendMobileOtp(mobile) {
    if (!mobile) {
      throw new Error("Mobile number is required.");
    }

    const result = await OtpService.createAndDispatchOtp({
      identifier: mobile,
      type: "mobile_otp",
      medium: "sms"
    });

    return result;
  }

  // 3. Verify Mobile OTP & Login/Signup
  static async verifyMobileOtp(mobile, otp, initialDepartment = "Computer Science & Engineering (CSE)") {
    if (!mobile || !otp) {
      throw new Error("Mobile number and OTP code are both required.");
    }

    // Enforce OTP verification against stored hash
    await OtpService.verifyOtp({
      identifier: mobile,
      otp,
      type: "mobile_otp"
    });

    let user = await User.findByMobile(mobile);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const id = "usr_" + uuidv4().slice(0, 12);
      const safeDigits = mobile.replace(/\D/g, "").slice(-4) || "0000";
      const name = `Student (${safeDigits})`;
      const profilePic = `https://api.dicebear.com/7.x/bottts/svg?seed=mobile_${encodeURIComponent(mobile)}`;

      user = await User.create({
        id,
        name,
        mobile_number: mobile,
        mobile_verified: 1,
        login_method: "mobile",
        profile_pic_url: profilePic,
        role: initialDepartment,
        preferred_language: "en"
      });
    } else {
      await User.verifyMobile(user.id);
      user = await User.findById(user.id);
    }

    const token = generateToken(user);
    return {
      token,
      user,
      isNewUser
    };
  }

  // 4. Email Registration (Signup with unverified status + OTP dispatch)
  static async emailSignup({ name, email, password, department = "Computer Science & Engineering (CSE)" }) {
    if (!email || !password) {
      throw new Error("Email and password are required for registration.");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingRaw = await User.findRawByEmail(normalizedEmail);

    if (existingRaw) {
      if (existingRaw.email_verified) {
        const err = new Error("An account with this email already exists. Please sign in.");
        err.statusCode = 409;
        throw err;
      } else {
        // Update password & resend verification OTP
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        await User.updatePassword(existingRaw.id, passwordHash);

        const otpResult = await OtpService.createAndDispatchOtp({
          identifier: normalizedEmail,
          type: "email_verification",
          medium: "email"
        });

        return {
          success: true,
          message: "Verification code sent to your email. Please verify to complete registration.",
          email: normalizedEmail,
          devOtp: otpResult.devOtp
        };
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = "usr_" + uuidv4().slice(0, 12);
    const safeName = name || normalizedEmail.split("@")[0];
    const profilePic = `https://api.dicebear.com/7.x/bottts/svg?seed=email_${encodeURIComponent(safeName)}`;

    await User.create({
      id,
      name: safeName,
      email: normalizedEmail,
      email_verified: 0,
      password_hash: passwordHash,
      login_method: "email",
      profile_pic_url: profilePic,
      role: department,
      preferred_language: "en"
    });

    const otpResult = await OtpService.createAndDispatchOtp({
      identifier: normalizedEmail,
      type: "email_verification",
      medium: "email"
    });

    return {
      success: true,
      message: "Account created! A 6-digit verification code has been sent to your email.",
      email: normalizedEmail,
      devOtp: otpResult.devOtp
    };
  }

  // 5. Confirm Email Verification OTP & Complete Registration
  static async emailVerify({ email, otp }) {
    if (!email || !otp) {
      throw new Error("Email and verification code are required.");
    }

    const normalizedEmail = email.toLowerCase().trim();

    await OtpService.verifyOtp({
      identifier: normalizedEmail,
      otp,
      type: "email_verification"
    });

    const user = await User.findByEmail(normalizedEmail);
    if (!user) {
      throw new Error("Account not found. Please sign up again.");
    }

    await User.verifyEmail(user.id);
    const updatedUser = await User.findById(user.id);
    const token = generateToken(updatedUser);

    return {
      token,
      user: updatedUser,
      message: "Email verified successfully. Welcome to LearnAI!"
    };
  }

  // 6. Email & Password Login
  static async emailLogin({ email, password }) {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userRaw = await User.findRawByEmail(normalizedEmail);

    if (!userRaw) {
      const err = new Error("Account not found. Please register or check your email address.");
      err.statusCode = 401;
      throw err;
    }

    if (!userRaw.password_hash) {
      const err = new Error(`This account was registered using ${userRaw.login_method || "Google/Mobile"}. Please use that sign-in method.`);
      err.statusCode = 400;
      throw err;
    }

    if (!userRaw.email_verified) {
      const err = new Error("Email not verified. Please verify your email code before signing in.");
      err.statusCode = 403;
      err.emailNotVerified = true;
      err.email = normalizedEmail;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, userRaw.password_hash);
    if (!isMatch) {
      const err = new Error("Invalid email or password.");
      err.statusCode = 401;
      throw err;
    }

    const formattedUser = User.format(userRaw);
    const token = generateToken(formattedUser);

    return {
      token,
      user: formattedUser
    };
  }

  // 7. Resend Email Verification OTP
  static async resendEmailOtp(email) {
    if (!email) {
      throw new Error("Email is required.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findByEmail(normalizedEmail);

    if (!user) {
      throw new Error("No account found with this email.");
    }

    const result = await OtpService.createAndDispatchOtp({
      identifier: normalizedEmail,
      type: "email_verification",
      medium: "email"
    });

    return result;
  }

  // 8. Forgot Password (Trigger Reset OTP)
  static async forgotPassword(email) {
    if (!email) {
      throw new Error("Email is required.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findByEmail(normalizedEmail);

    if (!user) {
      throw new Error("No account found with this email.");
    }

    const result = await OtpService.createAndDispatchOtp({
      identifier: normalizedEmail,
      type: "password_reset",
      medium: "email"
    });

    return {
      success: true,
      message: "Password reset code sent to your email.",
      email: normalizedEmail,
      devOtp: result.devOtp
    };
  }

  // 9. Reset Password with OTP
  static async resetPassword({ email, otp, newPassword }) {
    if (!email || !otp || !newPassword) {
      throw new Error("Email, verification code, and new password are required.");
    }

    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long.");
    }

    const normalizedEmail = email.toLowerCase().trim();

    await OtpService.verifyOtp({
      identifier: normalizedEmail,
      otp,
      type: "password_reset"
    });

    const user = await User.findByEmail(normalizedEmail);
    if (!user) {
      throw new Error("Account not found.");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await User.updatePassword(user.id, passwordHash);

    return {
      success: true,
      message: "Password reset successfully. You may now log in with your new password."
    };
  }
}
