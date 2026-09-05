import { body, param, validationResult } from "express-validator";

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

export const validateGoogleAuth = [
  body("id_token")
    .custom((val, { req }) => {
      const token = val || req.body.credential || req.body.token;
      if (!token || typeof token !== "string" || token.trim().length === 0) {
        throw new Error("Google id_token is required");
      }
      return true;
    }),
  handleValidationErrors
];

export const validateSendOtp = [
  body("mobile")
    .custom((val, { req }) => {
      const mobile = val || req.body.mobile_number;
      if (!mobile || !/^[+]?[0-9]{10,15}$/.test(mobile.toString().trim())) {
        throw new Error("Please provide a valid 10-15 digit mobile number (E.164 format)");
      }
      return true;
    }),
  handleValidationErrors
];

export const validateVerifyOtp = [
  body("mobile")
    .custom((val, { req }) => {
      const mobile = val || req.body.mobile_number;
      if (!mobile || !/^[+]?[0-9]{10,15}$/.test(mobile.toString().trim())) {
        throw new Error("Please provide a valid mobile number");
      }
      return true;
    }),
  body("otp")
    .trim()
    .matches(/^[0-9]{4,8}$/)
    .withMessage("OTP must be a numeric 4-8 digit code"),
  handleValidationErrors
];

export const validateEmailSignup = [
  body("name").trim().notEmpty().isLength({ min: 2, max: 100 }).withMessage("Name is required (2-100 characters)"),
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email address is required"),
  body("password").isLength({ min: 6, max: 100 }).withMessage("Password must be at least 6 characters"),
  handleValidationErrors
];

export const validateEmailVerify = [
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email address is required"),
  body("otp").trim().matches(/^[0-9]{4,8}$/).withMessage("OTP must be a numeric code"),
  handleValidationErrors
];

export const validateEmailLogin = [
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email address is required"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors
];

export const validateForgotPassword = [
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email address is required"),
  handleValidationErrors
];

export const validateResetPassword = [
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email address is required"),
  body("otp").trim().matches(/^[0-9]{4,8}$/).withMessage("OTP must be a numeric code"),
  body("newPassword")
    .custom((val, { req }) => {
      const pwd = val || req.body.password;
      if (!pwd || pwd.length < 6) {
        throw new Error("New password must be at least 6 characters");
      }
      return true;
    }),
  handleValidationErrors
];

export const validateSummarize = [
  body("book_id").trim().notEmpty().withMessage("book_id is required"),
  body("target_language").optional().trim().isLength({ min: 2, max: 10 }).withMessage("Invalid target_language code"),
  handleValidationErrors
];

export const validateTTS = [
  body("text").trim().notEmpty().isLength({ max: 5000 }).withMessage("Text is required and must not exceed 5000 characters"),
  body("language").optional().trim().isLength({ min: 2, max: 10 }).withMessage("Invalid language code"),
  handleValidationErrors
];

export const validateGenerateQuiz = [
  body("book_id").trim().notEmpty().withMessage("book_id is required"),
  body("num_questions").optional().isInt({ min: 1, max: 30 }).withMessage("num_questions must be between 1 and 30"),
  handleValidationErrors
];

export const validateSubmitQuiz = [
  body("quiz_id").trim().notEmpty().withMessage("quiz_id is required"),
  body("answers").notEmpty().withMessage("answers object is required"),
  handleValidationErrors
];

export const validateProfile = [
  body("name").optional().trim().isLength({ min: 1, max: 100 }).withMessage("Name must be between 1 and 100 characters"),
  body("role").optional().trim().isLength({ min: 1, max: 100 }).withMessage("Role must be between 1 and 100 characters"),
  body("preferred_language").optional().trim().isLength({ min: 2, max: 10 }).withMessage("Invalid language code"),
  body("preferredLanguage").optional().trim().isLength({ min: 2, max: 10 }).withMessage("Invalid language code"),
  handleValidationErrors
];
