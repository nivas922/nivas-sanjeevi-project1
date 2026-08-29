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
    if (this.voices.length === 0 && this.synth) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  findVoiceForLanguage(langCode) {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    // Language mapping prefixes
    const langMap = {
      en: ["en-US", "en-GB", "en-IN", "en"],
      ta: ["ta-IN", "ta"],
      hi: ["hi-IN", "hi"],
      te: ["te-IN", "te"],
      kn: ["kn-IN", "kn"],
      ml: ["ml-IN", "ml"],
      bn: ["bn-IN", "bn-BD", "bn"],
    };

    const targetPrefixes = langMap[langCode] || ["en-US", "en"];

    for (const prefix of targetPrefixes) {
      const match = voices.find(v => v.lang.toLowerCase().startsWith(prefix.toLowerCase()));
      if (match) return match;
    }

    // Default fallback
    return voices.find(v => v.lang.startsWith("en")) || voices[0] || null;
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

    this.stop(); // Stop any current speech

    if (!text || text.trim().length === 0) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
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
