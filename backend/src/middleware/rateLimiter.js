import rateLimit from "express-rate-limit";

// Rate limiting on OTP generation / verification: 5 requests per 10 minutes
export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10, // Generous for testing, prevents brute-force
  message: {
    success: false,
    error: "Too many OTP requests from this address. Please try again after 10 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting on AI API calls (summarization, quiz generation, TTS): 30 requests per minute
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: "AI service request limit exceeded. Please wait a moment before sending more requests."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    error: "Too many requests. Please slow down."
  },
  standardHeaders: true,
  legacyHeaders: false
});
