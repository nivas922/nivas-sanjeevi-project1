import { TtsService } from "../services/ttsService.js";
import { isLanguageSupported, SUPPORTED_LANGUAGES } from "../config/languageConfig.js";
import { resolveAuthUser } from "../middleware/auth.js";

export class TtsController {
  // POST /text-to-speech
  static async synthesize(req, res, next) {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ success: false, error: "Text is required for speech synthesis." });
      }

      // Read language from body or fall back to user's preferred_language
      if (req.body.language && !isLanguageSupported(req.body.language)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported language: '${req.body.language}'. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(", ")}.`
        });
      }
      const currentUser = await resolveAuthUser(req);
      const language = req.body.language || currentUser?.preferred_language || "en";

      const result = await TtsService.synthesizeSpeech({
        text: text.trim(),
        language
      });

      // Resolve full audio URL using the active request host and protocol
      const host = req.get("host");
      const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const fullAudioUrl = host && result.audioUrl ? `${proto}://${host}${result.audioUrl}` : result.audioUrl;

      return res.status(200).json({
        success: true,
        status: "success",
        ...result,
        audioUrl: fullAudioUrl,
        relativeAudioUrl: result.audioUrl
      });
    } catch (error) {
      next(error);
    }
  }
}
