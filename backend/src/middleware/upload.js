import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { env, parseBoundedFileSizeMb } from "../config/env.js";
import { StoragePreflight } from "../config/storagePreflight.js";

import { CloudinaryService } from "../services/cloudinaryService.js";

export const isCloudinary = CloudinaryService.isConfigured();

// Production fail-closed guard: prohibit silent fallback to local disk storage if Cloudinary is configured
if (env.NODE_ENV === "production" && (env.STORAGE_TYPE === "cloudinary" || process.env.STORAGE_TYPE === "cloudinary") && !isCloudinary) {
  const errorMsg = "CRITICAL STORAGE CONFIGURATION ERROR: STORAGE_TYPE='cloudinary' is configured in production, but valid Cloudinary credentials are missing. Silent fallback to local disk storage is strictly prohibited.";
  console.error("❌ [Upload Middleware]", errorMsg);
  throw new Error(errorMsg);
}

// Validate storage preflight before configuring multer disk storage in local mode - fail closed immediately if invalid
if (!isCloudinary) {
  const preflightResult = StoragePreflight.validate();
  if (!preflightResult.ok) {
    const errorMsg = `CRITICAL STORAGE PREFLIGHT ERROR: Cannot configure upload storage. ${preflightResult.errors.join("; ")}`;
    console.error("❌ [Upload Middleware]", errorMsg);
    throw new Error(errorMsg);
  }
}

// Storage engine - local diskStorage for offline mode, memoryStorage for cloud streaming
const diskStorage = multer.diskStorage({
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

export const storage = isCloudinary ? multer.memoryStorage() : diskStorage;

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

// Configurable limits: 50MB local default, separate configurable limit for Cloudinary (bounded 1-100MB)
export const getMaxFileSize = () => {
  if (isCloudinary) {
    const mb = parseBoundedFileSizeMb(env.CLOUDINARY_MAX_FILE_SIZE_MB, 10, 1, 100);
    return mb * 1024 * 1024;
  }
  const mb = parseBoundedFileSizeMb(env.MAX_FILE_SIZE_MB, 50, 1, 100);
  return mb * 1024 * 1024;
};

const rawUploadBook = multer({
  storage,
  limits: { fileSize: (env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024 },
  fileFilter: textbookFilter
}).single("file");

export const uploadBookMiddleware = (req, res, next) => {
  // Dynamically apply appropriate limit depending on active storage engine
  const activeLimit = getMaxFileSize();
  const activeUploader = multer({
    storage,
    limits: { fileSize: activeLimit },
    fileFilter: textbookFilter
  }).single("file");

  activeUploader(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        const limitMb = Math.round(activeLimit / (1024 * 1024));
        return res.status(400).json({
          success: false,
          error: `File size exceeds maximum allowed upload limit of ${limitMb}MB.`
        });
      }
      return res.status(err.statusCode || 400).json({
        success: false,
        error: err.message || "File upload failed."
      });
    }
    next();
  });
};


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
