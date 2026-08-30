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
    return map[langCode] || langCode || "en-US";
  }

  findVoiceForLanguage(langCode) {
    const voices = this.getVoices();
    const bcp47 = this.getBcp47Code(langCode).toLowerCase();
    const shortCode = langCode ? langCode.toLowerCase() : "en";

    if (!voices || voices.length === 0) return null;

    // 1. Try exact BCP-47 match (e.g., ta-IN, hi-IN)
    let match = voices.find(v => v.lang.toLowerCase() === bcp47);
    if (match) return match;

    // 2. Try prefix match (e.g., ta, hi, te)
    match = voices.find(v => v.lang.toLowerCase().startsWith(shortCode));
    if (match) return match;

    // 3. Try name matching (e.g., "Tamil", "Hindi", "Google हिन्दी", etc.)
    const nameMap = {
      ta: "tamil",
      hi: "hindi",
      te: "telugu",
      kn: "kannada",
      ml: "malayalam",
      bn: "bengali"
    };
    const targetName = nameMap[shortCode];
    if (targetName) {
      match = voices.find(v => v.name.toLowerCase().includes(targetName));
      if (match) return match;
    }

    // 4. Default fallback
    return voices.find(v => v.lang.toLowerCase().startsWith("en")) || voices[0] || null;
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

    // Clean text of markdown artifacts for natural reading
    const cleanText = text
      .replace(/[*_#`~\[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const bcp47 = this.getBcp47Code(lang);
    utterance.lang = bcp47;
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));
    utterance.pitch = pitch;

    if (voiceName) {
      const selected = this.getVoices().find(v => v.name === voiceName);
      if (selected) utterance.voice = selected;
    } else {
      const matchedVoice = this.findVoiceForLanguage(lang);
      if (matchedVoice) utterance.voice = matchedVoice;
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
