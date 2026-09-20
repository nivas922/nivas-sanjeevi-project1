import { env } from "../config/env.js";

export const errorHandler = (err, req, res, next) => {
  const isProd = env.NODE_ENV === "production";

  // Sanitize log: log error message without dumping potential secret env values
  console.error(`❌ [Error Handler] ${req.method} ${req.originalUrl}:`, isProd ? err.message : err.stack || err);

  // 1. Multer Upload Errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File size exceeds allowed limit (Max 50MB for textbooks, 5MB for images)."
      });
    }
    return res.status(400).json({ success: false, error: err.message || "File upload error." });
  }

  // 2. JWT Authentication Errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired authentication token. Please sign in again."
    });
  }

  // 3. CORS Policy Errors
  if (err.message && err.message.includes("CORS policy violation")) {
    return res.status(403).json({
      success: false,
      error: "Access denied by CORS policy."
    });
  }

  // 4. JSON Body Parse Errors
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      error: "Malformed JSON payload in request body."
    });
  }

  const statusCode = err.statusCode || (err.status ? err.status : 500);

  // In production, internal server errors (500) must not leak stack traces, database schema, or internal paths
  let safeMessage = err.message || "An unexpected internal server error occurred.";
  if (isProd && statusCode >= 500) {
    safeMessage = "An unexpected internal server error occurred. Please try again later.";
  }

  return res.status(statusCode).json({
    success: false,
    error: safeMessage
  });
};
