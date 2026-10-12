import { api } from "./api";

// Supported Indian languages and English BCP-47 mapping per Requirement 3
export const LANGUAGE_LOCALE_MAP = {
  en: "en-IN",
  ta: "ta-IN",
  hi: "hi-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  bn: "bn-IN"
};

export const LANGUAGE_META = {
  en: { name: "English", native: "English", flag: "🇮🇳", bcp47: "en-IN" },
  ta: { name: "Tamil", native: "தமிழ்", flag: "🇮🇳", bcp47: "ta-IN" },
  hi: { name: "Hindi", native: "हिन्दी", flag: "🇮🇳", bcp47: "hi-IN" },
  te: { name: "Telugu", native: "తెలుగు", flag: "🇮🇳", bcp47: "te-IN" },
  kn: { name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳", bcp47: "kn-IN" },
  ml: { name: "Malayalam", native: "മലയാളം", flag: "🇮🇳", bcp47: "ml-IN" },
  bn: { name: "Bengali", native: "বাংলা", flag: "🇮🇳", bcp47: "bn-IN" }
};

class SpeechService {
  constructor() {
    this.synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    this.voices = [];
    this.listeners = [];
    this.currentUtterance = null;
    this.currentAudio = null;
    this.isSpeaking = false;
    this.isPaused = false;
    this.heartbeatTimer = null;
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const updateVoices = () => {
      try {
        const loaded = this.synth.getVoices();
        if (loaded && loaded.length > 0) {
          this.voices = loaded;
          this.notifyListeners();
        }
      } catch (e) {
        console.warn("Could not get speech voices:", e);
      }
    };

    updateVoices();

    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = updateVoices;
    }
    if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    }
  }

  onVoicesChanged(callback) {
    if (typeof callback !== "function") return () => {};
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    for (const cb of this.listeners) {
      try {
        cb(this.voices);
      } catch (e) {
        console.error("Voice listener error:", e);
      }
    }
  }

  getVoices() {
    if (this.synth) {
      try {
        const loaded = this.synth.getVoices();
        if (loaded && loaded.length > 0) {
          this.voices = loaded;
        }
      } catch (e) {
        // ignore
      }
    }
    return this.voices || [];
  }

  getBcp47Code(langCode) {
    if (!langCode) return "en-IN";
    const normalized = langCode.toLowerCase().split(/[-_]/)[0];
    return LANGUAGE_LOCALE_MAP[normalized] || "en-IN";
  }

  getLanguageMeta(langCode) {
    const normalized = (langCode || "en").toLowerCase().split(/[-_]/)[0];
    return LANGUAGE_META[normalized] || LANGUAGE_META.en;
  }

  findMatchingVoice(langCode = "en", voiceName = null) {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    const baseLang = (langCode || "en").toLowerCase().split(/[-_]/)[0];
    const targetBcp47 = this.getBcp47Code(baseLang).toLowerCase();

    // 1. If a specific voiceName was requested, see if it exists and matches this language
    if (voiceName) {
      const namedVoice = voices.find(v => v.name === voiceName);
      if (namedVoice) {
        const vLang = (namedVoice.lang || "").toLowerCase().replace("_", "-");
        // For English, accept if it's an English voice
        if (baseLang === "en" && vLang.startsWith("en")) {
          return namedVoice;
        }
        // For Indian languages, accept only if it matches baseLang
        if (vLang.startsWith(baseLang)) {
          return namedVoice;
        }
      }
    }

    // 2. English voice matching: prioritize en-IN (Indian English per Requirement 3)
    if (baseLang === "en") {
      // Look for en-IN exact match first
      const enInVoice = voices.find(v => {
        const vl = (v.lang || "").toLowerCase().replace("_", "-");
        return vl === "en-in";
      });
      if (enInVoice) return enInVoice;

      // Look for voice with India/Indian/Ravi/Heera in name with English lang
      const enInNameVoice = voices.find(v => {
        const vl = (v.lang || "").toLowerCase().replace("_", "-");
        const vn = (v.name || "").toLowerCase();
        return vl.startsWith("en") && (vn.includes("india") || vn.includes("indian") || vn.includes("ravi") || vn.includes("heera"));
      });
      if (enInNameVoice) return enInNameVoice;

      // Fallback to any available English voice (e.g. en-US, en-GB)
      const anyEnVoice = voices.find(v => (v.lang || "").toLowerCase().startsWith("en"));
      if (anyEnVoice) return anyEnVoice;

      return null;
    }

    // 3. Indian language matching: strict matching for baseLang (ta, hi, te, kn, ml, bn)
    // 3a. Exact BCP-47 match (e.g. ta-IN, hi-IN, te-IN)
    const exactMatch = voices.find(v => {
      const vl = (v.lang || "").toLowerCase().replace("_", "-");
      return vl === targetBcp47;
    });
    if (exactMatch) return exactMatch;

    // 3b. Language prefix match (e.g. ta-*, hi-*, te-*, or plain ta, hi)
    const prefixMatch = voices.find(v => {
      const vl = (v.lang || "").toLowerCase().replace("_", "-");
      return vl.startsWith(`${baseLang}-`) || vl === baseLang;
    });
    if (prefixMatch) return prefixMatch;

    // 3c. Voice name contains the language name or native name (e.g. "Google தமிழ்")
    const meta = LANGUAGE_META[baseLang];
    if (meta) {
      const nameMatch = voices.find(v => {
        const vn = (v.name || "").toLowerCase();
        return vn.includes(meta.name.toLowerCase()) || vn.includes(meta.native);
      });
      if (nameMatch) return nameMatch;
    }

    // NEVER fall back to an English voice for an Indian language!
    return null;
  }

  hasVoiceForLanguage(langCode) {
    return Boolean(this.findMatchingVoice(langCode));
  }

  getVoicesForLanguage(langCode = "en") {
    const voices = this.getVoices();
    const baseLang = (langCode || "en").toLowerCase().split(/[-_]/)[0];

    if (baseLang === "en") {
      const enVoices = voices.filter(v => (v.lang || "").toLowerCase().startsWith("en"));
      // Sort en-IN to the top
      return enVoices.sort((a, b) => {
        const aIsIndian = (a.lang || "").toLowerCase().includes("in") || (a.name || "").toLowerCase().includes("india") || (a.name || "").toLowerCase().includes("ravi") || (a.name || "").toLowerCase().includes("heera");
        const bIsIndian = (b.lang || "").toLowerCase().includes("in") || (b.name || "").toLowerCase().includes("india") || (b.name || "").toLowerCase().includes("ravi") || (b.name || "").toLowerCase().includes("heera");
        if (aIsIndian && !bIsIndian) return -1;
        if (!aIsIndian && bIsIndian) return 1;
        return 0;
      });
    }

    const meta = LANGUAGE_META[baseLang];
    return voices.filter(v => {
      const vl = (v.lang || "").toLowerCase().replace("_", "-");
      const vn = (v.name || "").toLowerCase();
      return vl.startsWith(baseLang) || (meta && (vn.includes(meta.name.toLowerCase()) || vn.includes(meta.native)));
    });
  }

  getAllGroupedVoices() {
    const langKeys = ["ta", "hi", "te", "kn", "ml", "bn", "en"];
    return langKeys.map(key => {
      const meta = LANGUAGE_META[key];
      const matchedVoices = this.getVoicesForLanguage(key).map(v => ({
        name: v.name,
        lang: v.lang,
        langCode: key,
        isDefault: v.default || false
      }));

      return {
        langCode: key,
        langName: `${meta.name} (${meta.native})`,
        flag: meta.flag,
        bcp47: meta.bcp47,
        isAvailable: matchedVoices.length > 0,
        voices: matchedVoices
      };
    });
  }

  playAudioUrl(url, { rate = 1.0, onStart = () => {}, onEnd = () => {}, onPause = () => {}, onResume = () => {}, onError = () => {} } = {}) {
    this.stop();

    const audio = new Audio(url);
    this.currentAudio = audio;
    audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));

    audio.onplay = () => {
      this.isSpeaking = true;
      this.isPaused = false;
      onStart();
    };

    audio.onpause = () => {
      if (this.currentAudio === audio && !audio.ended) {
        this.isPaused = true;
        this.isSpeaking = false;
        onPause();
      }
    };

    audio.onended = () => {
      if (this.currentAudio === audio) {
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentAudio = null;
        onEnd();
      }
    };

    audio.onerror = (e) => {
      if (this.currentAudio === audio) {
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentAudio = null;
        onError(e);
      }
    };

    audio.play().catch(err => {
      console.warn("Audio playback failed:", err);
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentAudio = null;
      onError(err);
    });
  }

  async speak({
    text,
    lang = "en",
    rate = 1.0,
    pitch = 1.0,
    voiceName = null,
    onStart = () => {},
    onEnd = () => {},
    onPause = () => {},
    onResume = () => {},
    onError = () => {}
  }) {
    if (!text || text.trim().length === 0) {
      return;
    }

    this.stop();

    const cleanText = text
      .replace(/[*_#`~\[\]()]/g, " ")
      .replace(/[\n\r]+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

    const baseLang = (lang || "en").toLowerCase().split(/[-_]/)[0];
    const bcp47 = this.getBcp47Code(baseLang);
    const meta = this.getLanguageMeta(baseLang);

    // 1. Inspect browser voices
    const matchedVoice = this.findMatchingVoice(baseLang, voiceName);

    if (this.synth && matchedVoice) {
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.cancel();

      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = matchedVoice.lang || bcp47;
        utterance.voice = matchedVoice;
        utterance.rate = Math.max(0.5, Math.min(2.0, rate));
        utterance.pitch = Math.max(0.5, Math.min(1.5, pitch));

        utterance.onstart = () => {
          this.isSpeaking = true;
          this.isPaused = false;
          onStart({ mode: "browser", voice: matchedVoice.name, lang: utterance.lang });

          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = setInterval(() => {
            if (this.synth && this.synth.speaking && !this.synth.paused) {
              this.synth.pause();
              this.synth.resume();
            } else {
              clearInterval(this.heartbeatTimer);
            }
          }, 8000);
        };

        utterance.onend = () => {
          this.isSpeaking = false;
          this.isPaused = false;
          this.currentUtterance = null;
          clearInterval(this.heartbeatTimer);
          onEnd();
        };

        utterance.onpause = () => {
          this.isPaused = true;
          onPause();
        };

        utterance.onresume = () => {
          this.isPaused = false;
          onResume();
        };

        utterance.onerror = (err) => {
          console.warn("SpeechSynthesis utterance error:", err);
          this.isSpeaking = false;
          this.isPaused = false;
          this.currentUtterance = null;
          clearInterval(this.heartbeatTimer);
          onError(err);
        };

        this.currentUtterance = utterance;
        if (typeof window !== "undefined") {
          window.__learnAiActiveUtterance = utterance;
        }

        this.synth.speak(utterance);
        return { mode: "browser", voice: matchedVoice.name };
      } catch (err) {
        console.error("Browser speech synthesis initiation error:", err);
      }
    }

    // 2. Browser voice is unavailable for this language.
    // NEVER fall back to an English voice or pretend Tamil is working!
    // Try the project's backend TTS service for authentic audio:
    try {
      const res = await api.textToSpeech(cleanText, baseLang);
      if (res && res.audioUrl) {
        this.playAudioUrl(res.audioUrl, {
          rate,
          onStart: () => onStart({ mode: "backend", voice: res.voiceModel || `${meta.name} Cloud TTS`, lang: bcp47 }),
          onEnd,
          onPause,
          onResume,
          onError
        });
        return { mode: "backend", audioUrl: res.audioUrl };
      }
    } catch (backendErr) {
      console.warn("Backend TTS service notice:", backendErr.message);
    }

    // 3. Neither browser voice nor backend TTS is available.
    // Return structured error with clear instructions on enabling the language voice.
    const err = new Error(
      `A speech voice for ${meta.name} (${bcp47}) is not installed on this browser or operating system.`
    );
    err.code = "VOICE_UNAVAILABLE";
    err.language = baseLang;
    err.bcp47 = bcp47;
    err.langName = meta.name;
    err.instructions = `To enable ${meta.name} speech:\n• Windows: Go to Settings → Time & Language → Language & Region → Add ${meta.name} and install the Speech / Text-to-speech package.\n• Recommended Browser: Use Microsoft Edge or Google Chrome with Indian language voice packs installed.`;

    this.isSpeaking = false;
    this.isPaused = false;
    onError(err);
    return { mode: "unavailable", error: err };
  }

  pause() {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.isPaused = true;
      return;
    }
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  resume() {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(console.warn);
      this.isPaused = false;
      return;
    }
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  stop() {
    clearInterval(this.heartbeatTimer);
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // ignore
      }
      this.currentUtterance = null;
    }
    this.isSpeaking = false;
    this.isPaused = false;
  }

  getStatus() {
    return {
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      isSupported: Boolean(this.synth)
    };
  }
}

export const speechService = new SpeechService();
