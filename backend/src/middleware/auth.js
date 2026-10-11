import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export const DEFAULT_USER_ID = "usr_default";

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email_or_mobile: user.email_or_mobile,
      role: user.role,
      login_method: user.login_method,
      preferred_language: user.preferred_language
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

/**
 * Strict authentication guard for routes that require an authentic JWT.
 * Returns 401 Unauthorized if the token is missing, invalid, forged, or expired.
 */
export const authGuard = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication token required."
      });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired authentication token."
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found."
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.error("Auth guard error:", error);
    return res.status(500).json({ success: false, error: "Authentication verification failed." });
  }
};

/**
 * Safely resolves the authenticated user ID if a cryptographically valid JWT was supplied.
 * Returns null if no token, forged token, or expired token is passed.
 * Does NOT treat arbitrary unverified tokens as trusted.
 */
export const resolveAuthUserId = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, env.JWT_SECRET);
      return decoded.id || null;
    }
  } catch {
    return null;
  }
  return null;
};

/**
 * Safely resolves the User object if a cryptographically valid JWT was supplied,
 * otherwise falls back to the default student profile.
 */
export const resolveAuthUser = async (req) => {
  const userId = resolveAuthUserId(req);
  if (userId) {
    const user = await User.findById(userId);
    if (user) return user;
  }
  return await User.findById(DEFAULT_USER_ID);
};

