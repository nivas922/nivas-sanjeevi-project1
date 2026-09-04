import { env } from "./env.js";

export const translateConfig = {
  apiKey: env.GOOGLE_TRANSLATE_API_KEY,
  supportedLanguages: [
    { code: "en", name: "English" },
    { code: "ta", name: "Tamil", native: "தமிழ்" },
    { code: "hi", name: "Hindi", native: "हिन्दी" },
    { code: "te", name: "Telugu", native: "తెలుగు" },
    { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
    { code: "ml", name: "Malayalam", native: "മലയാളം" },
    { code: "bn", name: "Bengali", native: "বাংলা" }
  ]
};
