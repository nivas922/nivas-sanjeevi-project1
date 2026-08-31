import { translatorService } from "./translatorService";

class SpeechService {
  constructor() {
    this.synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    this.voices = [];
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.isPaused = false;
    this.heartbeatTimer = null;
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const updateVoices = () => {
      try {
        this.voices = this.synth.getVoices();
      } catch (e) {
        console.warn("Could not get speech voices:", e);
      }
    };

    updateVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = updateVoices;
    }
  }

  getVoices() {
    if (this.synth && (!this.voices || this.voices.length === 0)) {
      try {
        this.voices = this.synth.getVoices();
      } catch (e) {
        this.voices = [];
      }
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

    // Standard presets for Indian languages
    const languageVoicePresets = {
      ta: [
        { name: "Tamil Natural Voice (தமிழ் - ta-IN)", lang: "ta-IN", default: true },
        { name: "Google தமிழ் (ta-IN)", lang: "ta-IN" },
        { name: "Microsoft Valluvar (ta-IN)", lang: "ta-IN" }
      ],
      hi: [
        { name: "Hindi Natural Voice (हिन्दी - hi-IN)", lang: "hi-IN", default: true },
        { name: "Google हिन्दी (hi-IN)", lang: "hi-IN" },
        { name: "Microsoft Hemant (hi-IN)", lang: "hi-IN" }
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

    if (langCode === "en") {
      return allVoices.length > 0 ? allVoices : languageVoicePresets.en;
    }

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

  // Fallback Audio Tone Synthesizer for when SpeechSynthesis is unavailable
  playAudioBeep(freq = 440, duration = 0.15) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignore audio context restriction
    }
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
    if (!text || text.trim().length === 0) {
      return;
    }

    // Safety cleanup
    this.stop();

    if (!this.synth) {
      this.playAudioBeep(520, 0.2);
      onError(new Error("Speech synthesis not supported in this browser."));
      return;
    }

    // Clean text of markdown formatting
    let cleanText = text
      .replace(/[*_#`~\[\]()]/g, " ")
      .replace(/[\n\r]+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

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

    // If Indian language has no native TTS voice installed on this Windows OS, use phonetic pronunciation
    if (!selectedVoice && lang !== "en") {
      cleanText = translatorService.getPhoneticPronunciation(cleanText, lang);
    }

    // Unfreeze synthesis queue on Chromium
    if (this.synth.paused) {
      this.synth.resume();
    }
    this.synth.cancel();

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = selectedVoice ? bcp47 : "en-US";
      utterance.rate = Math.max(0.5, Math.min(2.0, rate));
      utterance.pitch = Math.max(0.5, Math.min(1.5, pitch));

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.isPaused = false;
        onStart();
        // Keep speech alive in Chrome for longer paragraphs
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
        console.warn("SpeechSynthesis error:", err);
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentUtterance = null;
        clearInterval(this.heartbeatTimer);
        onError(err);
      };

      // Critical Fix: Bind globally to window to prevent V8 Garbage Collection!
      this.currentUtterance = utterance;
      if (typeof window !== "undefined") {
        window.__learnAiActiveUtterance = utterance;
      }

      this.synth.speak(utterance);

    } catch (err) {
      console.error("Speech initiation error:", err);
      this.playAudioBeep(440, 0.2);
      onError(err);
    }
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
    clearInterval(this.heartbeatTimer);
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // ignore
      }
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
