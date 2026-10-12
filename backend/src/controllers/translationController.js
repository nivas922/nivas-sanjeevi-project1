import { TranslationService } from "../services/translationService.js";
import { isLanguageSupported, SUPPORTED_LANGUAGES } from "../config/languageConfig.js";

export class TranslationController {
  // POST /translate
  static async translateText(req, res, next) {
    try {
      const body = req.body || {};
      const text = body.text || body.q || body.content;
      const rawTargetLang = body.target_language || body.targetLanguage || body.language;
      const sourceLang = body.source_language || body.sourceLanguage || "en";

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "text is required for translation."
        });
      }

      if (text.trim().length > 10000) {
        return res.status(400).json({
          success: false,
          error: "Text exceeds maximum allowed length of 10,000 characters."
        });
      }

      if (!rawTargetLang) {
        return res.status(400).json({
          success: false,
          error: "target_language is required."
        });
      }

      if (!isLanguageSupported(rawTargetLang)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported target language: '${rawTargetLang}'. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(", ")}.`
        });
      }

      const targetLang = rawTargetLang.trim().toLowerCase();

      const translated = await TranslationService.translateText(text.trim(), targetLang, sourceLang);

      return res.status(200).json({
        success: true,
        status: "success",
        text: translated,
        translatedText: translated,
        language: targetLang,
        target_language: targetLang,
        source_language: sourceLang
      });
    } catch (error) {
      next(error);
    }
  }
}
