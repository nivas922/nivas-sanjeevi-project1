import { TtsService } from "../services/ttsService.js";

export class TtsController {
  // POST /text-to-speech
  static async synthesize(req, res, next) {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ success: false, error: "Text is required for speech synthesis." });
      }

      // Read language from body or fall back to user's preferred_language
      const language = req.body.language || req.user?.preferred_language || "en";

      const result = await TtsService.synthesizeSpeech({
        text: text.trim(),
        language
      });

      return res.status(200).json({
        success: true,
        status: "success",
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}
