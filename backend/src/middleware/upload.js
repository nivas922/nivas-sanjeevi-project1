import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";

// Ensure uploads folder exists
if (!fs.existsSync(env.UPLOAD_DIR)) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}

// Storage engine - enforces safe randomized server-side filenames and prevents directory traversal
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Sanitize original extension
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    const cleanExt = rawExt.replace(/[^a-z0-9.]/gi, "");
    const safeName = `${Date.now()}-${uuidv4()}${cleanExt}`;
    cb(null, safeName);
  }
});

const DANGEROUS_EXTENSIONS = [
  ".exe", ".sh", ".bat", ".cmd", ".com", ".pif", ".scr", ".vbs",
  ".js", ".jar", ".php", ".py", ".rb", ".pl", ".cgi", ".msi"
];

// File filter for textbooks & academic documents
const textbookFilter = (req, file, cb) => {
  const originalName = file.originalname || "";
  const ext = path.extname(originalName).toLowerCase();

  // 1. Explicitly block executable and script extensions
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    const err = new Error("Security Violation: Executable and script file uploads are strictly prohibited.");
    err.statusCode = 400;
    return cb(err, false);
  }

  // 2. Allowed textbook extensions
  const allowedExtensions = [".pdf", ".docx", ".doc", ".txt", ".jpg", ".jpeg", ".png", ".webp"];
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  const hasValidExt = allowedExtensions.includes(ext);
  const hasValidMime = allowedMimeTypes.includes(file.mimetype);

  if (hasValidExt || hasValidMime) {
    cb(null, true);
  } else {
    const err = new Error("Unsupported file type. Allowed formats: PDF, DOC, DOCX, TXT, JPG, PNG, WEBP.");
    err.statusCode = 400;
    cb(err, false);
  }
};

// 50MB max limit for textbooks (configurable)
const maxFileSize = (env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024;
export const uploadBookMiddleware = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: textbookFilter
}).single("file");

// File filter for profile pictures
const avatarFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    const err = new Error("Security Violation: Dangerous file format prohibited.");
    err.statusCode = 400;
    return cb(err, false);
  }

  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".svg"];
  if (allowedExtensions.includes(ext) || file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    const err = new Error("Unsupported image format. Please upload JPG, PNG, WEBP, or SVG.");
    err.statusCode = 400;
    cb(err, false);
  }
};

// 5MB max limit for avatars
export const uploadAvatarMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: avatarFilter
}).single("avatar");
