import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "learnai_super_secret_jwt_key_2026",
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
  CORS_ORIGIN: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map(s => s.trim())
};
