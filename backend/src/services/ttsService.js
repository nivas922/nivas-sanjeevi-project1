import fs from "fs";
import path from "path";
import crypto from "crypto";
import { env } from "../config/env.js";
import { getLanguageConfig, isLanguageSupported, SUPPORTED_LANGUAGES } from "../config/languageConfig.js";

export class TtsService {
  /**
   * Synthesize real audio speech for text in target language
   */
  static async synthesizeSpeech({ text, language = "en" }) {
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      const err = new Error("Text is required for speech synthesis.");
      err.statusCode = 400;
      throw err;
    }

    if (language && !isLanguageSupported(language)) {
      const err = new Error(`Unsupported language code for TTS: '${language}'. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(", ")}`);
      err.statusCode = 400;
      throw err;
    }

    const langConfig = getLanguageConfig(language);
    const cleanText = text.replace(/[*_#`~\[\]()]/g, " ").replace(/\s+/g, " ").trim();

    console.log(`[TTS-Service] Synthesizing speech for ${cleanText.length} chars in '${langConfig.name}' (${langConfig.ttsCode})`);

    // 1. Generate unique hash for audio caching
    const textHash = crypto
      .createHash("md5")
      .update(`${langConfig.code}_${cleanText.slice(0, 500)}`)
      .digest("hex");

    const audioFileName = `tts-${langConfig.code}-${textHash.slice(0, 12)}.mp3`;
    const audioFilePath = path.join(env.UPLOAD_DIR, audioFileName);
    const audioUrl = `/uploads/${audioFileName}`;

    // 2. Check if cached audio file exists
    if (fs.existsSync(audioFilePath) && fs.statSync(audioFilePath).size > 100) {
      console.log(`[TTS-Service] Serving cached audio: ${audioUrl}`);
      return {
        success: true,
        status: "success",
        audioUrl,
        language: langConfig.ttsCode,
        languageName: langConfig.name,
        voiceModel: langConfig.voiceModel,
        textLength: cleanText.length,
        isRealAudio: true,
        cached: true
      };
    }

    // 3. Synthesize Real TTS Audio Buffer
    let audioBuffer = null;
    let isRealAudio = false;

    if (env.NODE_ENV !== "test") {
      try {
        audioBuffer = await this.fetchGoogleTtsAudio(cleanText, langConfig.ttsCode);
        isRealAudio = true;
      } catch (err) {
        console.warn(`[TTS-Service] Real TTS provider notice (${err.message}).`);
      }
    }

    // 4. Fallback Audio Handling
    if (!audioBuffer) {
      if (env.NODE_ENV === "test") {
        // Minimal valid MPEG-1 Layer 3 audio frame strictly for automated test suites
        audioBuffer = Buffer.from([
          0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]);
      } else {
        const err = new Error("TTS provider failed to synthesize audio. Please use browser speech synthesis.");
        err.statusCode = 502;
        throw err;
      }
    }

    // 5. Write audio buffer to upload directory
    fs.writeFileSync(audioFilePath, audioBuffer);

    return {
      success: true,
      status: "success",
      audioUrl,
      language: langConfig.ttsCode,
      languageName: langConfig.name,
      voiceModel: langConfig.voiceModel,
      textLength: cleanText.length,
      isRealAudio,
      cached: false
    };
  }

  /**
   * Fetch real playable audio speech MP3 bytes from Google TTS public API
   */
  static async fetchGoogleTtsAudio(text, ttsCode) {
    const chunkText = text.slice(0, 200);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunkText)}&tl=${ttsCode}&client=tw-ob`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!res.ok) {
      throw new Error(`Google TTS API returned HTTP ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
