import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const NODE_ENV = process.env.NODE_ENV || "development";
const DEFAULT_DEV_JWT_SECRET = "learnai_dev_jwt_secret_change_in_production_2026";

// Production Security Check: Fail startup if JWT_SECRET is missing or insecure in production
const resolveJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  const currentEnv = process.env.NODE_ENV || "development";
  if (currentEnv === "production") {
    if (!secret || secret.trim() === "" || secret.length < 32 || secret === DEFAULT_DEV_JWT_SECRET || secret === "learnai_super_secret_jwt_key_2026") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: A strong, unique JWT_SECRET environment variable (at least 32 characters) is mandatory in production mode. Please set JWT_SECRET in your environment."
      );
    }
    return secret;
  }
  return secret || DEFAULT_DEV_JWT_SECRET;
};

// Safe origins list
const parseCorsOrigins = () => {
  const origins = [];
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL.trim());
  }
  if (process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN.split(",").forEach((o) => {
      const trimmed = o.trim();
      if (trimmed && !origins.includes(trimmed)) {
        origins.push(trimmed);
      }
    });
  }
  // Always include the production frontend in allowed origins
  const productionFrontend = "https://nivas-sanjeevi-project1-pnb5.vercel.app";
  if (!origins.includes(productionFrontend)) {
    origins.push(productionFrontend);
  }

  // Include standard development origin if not production
  if (NODE_ENV !== "production") {
    if (!origins.includes("http://localhost:5173")) origins.push("http://localhost:5173");
    if (!origins.includes("http://localhost:3000")) origins.push("http://localhost:3000");
    if (!origins.includes("http://127.0.0.1:5173")) origins.push("http://127.0.0.1:5173");
  }
  return origins;
};

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV,
  JWT_SECRET: resolveJwtSecret(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  DB_TYPE: process.env.DB_TYPE || "sqlite",
  DB_FILE: process.env.DB_FILE || path.resolve(__dirname, "../../data/learnai.db"),
  STORAGE_TYPE: process.env.STORAGE_TYPE || "local",
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(__dirname, "../../uploads"),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY || "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  OTP_PROVIDER: process.env.OTP_PROVIDER || "dev",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "",
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || "",
  FRONTEND_URL: process.env.FRONTEND_URL || (NODE_ENV === "production" ? "https://nivas-sanjeevi-project1-pnb5.vercel.app" : "http://localhost:5173"),
  CORS_ORIGINS: parseCorsOrigins(),
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || "50", 10)
};

export const validateProductionConfig = () => {
  const currentEnv = process.env.NODE_ENV || env.NODE_ENV;
  if (currentEnv === "production") {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32 || secret === DEFAULT_DEV_JWT_SECRET || secret === "learnai_super_secret_jwt_key_2026") {
      throw new Error("CRITICAL SECURITY ERROR: Production JWT_SECRET is missing or insecure. It must be at least 32 characters long.");
    }
  }
  return true;
};
