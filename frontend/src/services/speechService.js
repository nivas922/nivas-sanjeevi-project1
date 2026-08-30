import { translatorService } from "./translatorService";

class SpeechService {
  constructor() {
    this.synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    this.voices = [];
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.isPaused = false;
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const updateVoices = () => {
      this.voices = this.synth.getVoices();
    };

    updateVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = updateVoices;
    }
  }

  getVoices() {
    if (this.synth && (!this.voices || this.voices.length === 0)) {
      this.voices = this.synth.getVoices();
    }
    return this.voices || [];
  }

  getBcp47Code(langCode) {
    const map = {
      ta: "ta-IN",
      hi: "hi-IN",
      te: "te-IN",
      kn: "kn-IN",
      ml: "ml-IN",
      bn: "bn-IN",
      en: "en-US"
    };
    return map[langCode] || "en-US";
  }

  // Get curated or browser voices matching the target language
  getVoicesForLanguage(langCode) {
    const allVoices = this.getVoices();
    const bcp47 = this.getBcp47Code(langCode).toLowerCase();
    const prefix = langCode ? langCode.toLowerCase() : "en";

    // 1. Language-tailored voice profiles for Indian Languages
    const languageVoicePresets = {
      ta: [
        { name: "Tamil Natural Voice (தமிழ் - ta-IN)", lang: "ta-IN", default: true },
        { name: "Google தமிழ் (ta-IN)", lang: "ta-IN" },
        { name: "Microsoft Valluvar (ta-IN)", lang: "ta-IN" }
      ],
      hi: [
        { name: "Hindi Natural Voice (हिन्दी - hi-IN)", lang: "hi-IN", default: true },
        { name: "Google हिन्दी (hi-IN)", lang: "hi-IN" },
        { name: "Microsoft Hemant (hi-IN)", lang: "hi-IN" },
        { name: "Microsoft Kalpana (hi-IN)", lang: "hi-IN" }
      ],
      te: [
        { name: "Telugu Natural Voice (తెలుగు - te-IN)", lang: "te-IN", default: true },
        { name: "Microsoft Mohan (te-IN)", lang: "te-IN" }
      ],
      kn: [
        { name: "Kannada Natural Voice (ಕನ್ನಡ - kn-IN)", lang: "kn-IN", default: true },
        { name: "Microsoft Gagan (kn-IN)", lang: "kn-IN" }
      ],
      ml: [
        { name: "Malayalam Natural Voice (മലയാളം - ml-IN)", lang: "ml-IN", default: true },
        { name: "Microsoft Midhun (ml-IN)", lang: "ml-IN" }
      ],
      bn: [
        { name: "Bengali Natural Voice (বাংলা - bn-IN)", lang: "bn-IN", default: true },
        { name: "Microsoft Bashkar (bn-IN)", lang: "bn-IN" }
      ],
      en: allVoices.length > 0 ? allVoices : [
        { name: "English Natural Voice (en-US)", lang: "en-US", default: true },
        { name: "English Indian Accent (en-IN)", lang: "en-IN" }
      ]
    };

    // If English, return system voices
    if (langCode === "en") {
      return allVoices.length > 0 ? allVoices : languageVoicePresets.en;
    }

    // For Indian languages, check if system has native voices for this language
    const matched = allVoices.filter(v => 
      v.lang.toLowerCase() === bcp47 ||
      (v.lang.toLowerCase().startsWith(prefix) && prefix !== "en") ||
      (v.name && v.name.toLowerCase().includes(prefix) && prefix !== "en")
    );

    if (matched.length > 0) {
      return matched;
    }

    return languageVoicePresets[langCode] || languageVoicePresets.ta;
  }

  speak({
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
    if (!this.synth) {
      onError(new Error("SpeechSynthesis is not supported in this browser."));
      return;
    }

    this.stop();

    if (!text || text.trim().length === 0) {
      return;
    }

    let cleanText = text
      .replace(/[*_#`~\[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Check if system has a native voice for this language
    const systemVoices = this.getVoices();
    const bcp47 = this.getBcp47Code(lang);
    let selectedVoice = null;

    if (voiceName) {
      selectedVoice = systemVoices.find(v => v.name === voiceName);
    }

    if (!selectedVoice) {
      selectedVoice = systemVoices.find(v => 
        v.lang.toLowerCase() === bcp47.toLowerCase() ||
        (v.lang.toLowerCase().startsWith(lang.toLowerCase()) && lang !== "en")
      );
    }

    // If no native voice installed on this Windows OS, use phonetic transliteration so it pronounces Indian words accurately!
    if (!selectedVoice && lang !== "en") {
      cleanText = translatorService.getPhoneticPronunciation(cleanText, lang);
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = selectedVoice ? bcp47 : "en-US";
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));
    utterance.pitch = pitch;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.isPaused = false;
      onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentUtterance = null;
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
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentUtterance = null;
      onError(err);
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  pause() {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentUtterance = null;
    }
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
