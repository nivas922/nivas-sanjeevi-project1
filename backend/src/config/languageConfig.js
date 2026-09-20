export const SUPPORTED_LANGUAGES = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    geminiName: "English",
    ttsCode: "en-IN",
    voiceModel: "en-US-Standard-C",
    flag: "🇬🇧"
  },
  ta: {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    geminiName: "Tamil",
    ttsCode: "ta-IN",
    voiceModel: "ta-IN-Standard-A",
    flag: "🇮🇳"
  },
  hi: {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    geminiName: "Hindi",
    ttsCode: "hi-IN",
    voiceModel: "hi-IN-Standard-A",
    flag: "🇮🇳"
  },
  te: {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    geminiName: "Telugu",
    ttsCode: "te-IN",
    voiceModel: "te-IN-Standard-A",
    flag: "🇮🇳"
  },
  kn: {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    geminiName: "Kannada",
    ttsCode: "kn-IN",
    voiceModel: "kn-IN-Standard-A",
    flag: "🇮🇳"
  },
  ml: {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    geminiName: "Malayalam",
    ttsCode: "ml-IN",
    voiceModel: "ml-IN-Standard-A",
    flag: "🇮🇳"
  },
  bn: {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    geminiName: "Bengali",
    ttsCode: "bn-IN",
    voiceModel: "bn-IN-Standard-A",
    flag: "🇮🇳"
  }
};

export const getLanguageConfig = (langCode = "en") => {
  const code = (langCode || "en").toLowerCase().trim();
  return SUPPORTED_LANGUAGES[code] || SUPPORTED_LANGUAGES.en;
};
