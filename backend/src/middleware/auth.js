import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

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

export const authGuard = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied. Authentication token required in 'Bearer <token>' format."
      });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired authentication token. Please sign in again."
      });
    }

    // Retrieve fresh user from database to ensure up-to-date role and preferred_language
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User associated with this token no longer exists."
      });
    }

    // Attach consistent user context to request
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.error("Auth guard error:", error);
    return res.status(500).json({ success: false, error: "Internal authentication error." });
  }
};
