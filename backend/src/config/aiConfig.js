import { env } from "./env.js";

export const aiConfig = {
  gemini: {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models"
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    endpoint: "https://api.openai.com/v1"
  }
};
