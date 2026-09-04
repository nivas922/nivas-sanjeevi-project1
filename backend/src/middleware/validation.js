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
  body("email").optional().isEmail().normalizeEmail().withMessage("Invalid email address"),
  body("name").optional().trim().isLength({ min: 1, max: 100 }).withMessage("Name must be between 1 and 100 characters"),
  handleValidationErrors
];

export const validateSendOtp = [
  body("mobile")
    .trim()
    .matches(/^[+]?[0-9]{10,15}$/)
    .withMessage("Please provide a valid 10-15 digit mobile number"),
  handleValidationErrors
];

export const validateVerifyOtp = [
  body("mobile")
    .trim()
    .matches(/^[+]?[0-9]{10,15}$/)
    .withMessage("Please provide a valid mobile number"),
  body("otp")
    .trim()
    .isLength({ min: 4, max: 8 })
    .withMessage("OTP must be between 4 and 8 digits"),
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
