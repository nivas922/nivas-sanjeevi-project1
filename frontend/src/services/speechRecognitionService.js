/**
 * LearnAI Speech Recognition Service
 * Standard Web Speech API (SpeechRecognition / webkitSpeechRecognition) wrapper.
 * Provides resilient, localized voice-to-text recognition across supported Indian languages.
 */

export const SPEECH_LOCALE_MAP = {
  en: "en-IN",
  ta: "ta-IN",
  hi: "hi-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  bn: "bn-IN",
  "en-in": "en-IN",
  "en-us": "en-US",
  "ta-in": "ta-IN",
  "hi-in": "hi-IN",
  "te-in": "te-IN",
  "kn-in": "kn-IN",
  "ml-in": "ml-IN",
  "bn-in": "bn-IN"
};

export const getSpeechLocale = (langCode = "en") => {
  if (!langCode) return "en-IN";
  const raw = String(langCode).trim();
  const normalized = raw.toLowerCase();
  if (SPEECH_LOCALE_MAP[normalized]) {
    return SPEECH_LOCALE_MAP[normalized];
  }
  const prefix = normalized.split(/[-_]/)[0];
  if (SPEECH_LOCALE_MAP[prefix]) {
    return SPEECH_LOCALE_MAP[prefix];
  }
  return "en-IN";
};

export const isSpeechRecognitionSupported = () => {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
};

export const getFriendlySpeechErrorMessage = (error, isSecure = true) => {
  if (!isSecure) {
    return "Speech recognition requires a secure context (HTTPS or localhost).";
  }
  switch (error) {
    case "not-allowed":
    case "permission-denied":
      return "Microphone access was denied. Please allow microphone permissions in your browser address bar settings.";
    case "no-speech":
      return "No speech was detected. Please check your microphone volume and speak clearly.";
    case "audio-capture":
      return "No microphone detected or hardware unavailable. Please plug in or enable your microphone.";
    case "network":
      return "Voice recognition network error. Please verify your internet connection.";
    case "aborted":
      return "Voice recognition was stopped.";
    case "service-not-allowed":
      return "Speech service is not allowed by your browser or platform policy.";
    case "bad-grammar":
    case "language-not-supported":
      return "The selected language is not supported for voice recognition on this browser.";
    default:
      return `Voice recognition error (${error || "unknown"}). You can type your question directly below.`;
  }
};

export class SpeechRecognitionService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isStarting = false;
    this.isStopping = false;
    this.abortedIntentionally = false;
    this.finalChunksMap = new Map();
    this.finalTranscript = "";
    this.interimTranscript = "";
  }

  isSupported() {
    return isSpeechRecognitionSupported();
  }

  start({
    lang = "en",
    onStart,
    onTranscript,
    onError,
    onEnd
  } = {}) {
    if (!this.isSupported()) {
      if (typeof onError === "function") {
        onError(
          "Voice input is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.",
          "unsupported"
        );
      }
      return false;
    }

    if (typeof window !== "undefined" && window.isSecureContext === false) {
      if (typeof onError === "function") {
        onError(getFriendlySpeechErrorMessage("secure", false), "insecure-context");
      }
      return false;
    }

    // Guard against rapid duplicate clicks while starting, listening, or stopping
    if (this.isStarting || this.isListening || this.isStopping) {
      return false;
    }

    this.isStarting = true;
    this.isStopping = false;
    this.abortedIntentionally = false;
    this.finalChunksMap.clear();
    this.finalTranscript = "";
    this.interimTranscript = "";

    try {
      // Clean up any stale listeners on previous recognition instance
      if (this.recognition) {
        try {
          this.recognition.onstart = null;
          this.recognition.onresult = null;
          this.recognition.onerror = null;
          this.recognition.onend = null;
        } catch {
          // Ignore
        }
      }

      const SpeechRecognitionConstructor =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionConstructor();

      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = getSpeechLocale(lang);

      this.recognition.onstart = () => {
        this.isStarting = false;
        this.isListening = true;
        this.isStopping = false;
        if (typeof onStart === "function") {
          onStart();
        }
      };

      this.recognition.onresult = (event) => {
        if (!event || !event.results) return;

        const results = event.results;
        let interimParts = [];

        // Standard cumulative SpeechRecognitionResultList semantics:
        // event.results contains all results from index 0 to results.length - 1.
        // Prune any stale entries if results list shrank, rebuild interimParts across
        // all current result indices, and maintain finalized entries strictly by index.
        for (const key of this.finalChunksMap.keys()) {
          if (key >= results.length) {
            this.finalChunksMap.delete(key);
          }
        }

        for (let i = 0; i < results.length; i++) {
          const res = results[i];
          if (!res) continue;
          const transcriptChunk = (res[0]?.transcript || "").trim();
          if (!transcriptChunk) {
            this.finalChunksMap.delete(i);
            continue;
          }

          if (res.isFinal) {
            this.finalChunksMap.set(i, transcriptChunk);
          } else {
            this.finalChunksMap.delete(i);
            interimParts.push(transcriptChunk);
          }
        }

        // Deterministically join finalized chunks in numerical sequence order
        const sortedIndices = Array.from(this.finalChunksMap.keys()).sort((a, b) => a - b);
        this.finalTranscript = sortedIndices
          .map((i) => this.finalChunksMap.get(i))
          .filter(Boolean)
          .join(" ");

        this.interimTranscript = interimParts.join(" ");

        const combinedText = (
          this.finalTranscript +
          (this.interimTranscript ? (this.finalTranscript ? " " : "") + this.interimTranscript : "")
        ).trim();

        if (typeof onTranscript === "function") {
          onTranscript({
            finalTranscript: this.finalTranscript,
            interimTranscript: this.interimTranscript,
            combinedText,
            isFinal: Boolean(this.finalTranscript && !this.interimTranscript)
          });
        }
      };

      this.recognition.onerror = (event) => {
        const errorCode = event.error || "unknown";
        if (errorCode === "aborted" && this.abortedIntentionally) {
          return;
        }

        this.isStarting = false;
        this.isListening = false;
        this.isStopping = false;

        const friendlyMsg = getFriendlySpeechErrorMessage(errorCode, true);
        if (typeof onError === "function") {
          onError(friendlyMsg, errorCode);
        }
      };

      this.recognition.onend = () => {
        const wasAborted = this.abortedIntentionally;
        this.isStarting = false;
        this.isListening = false;
        this.isStopping = false;

        // Discard unfinalized interim speech on intentional abort
        if (wasAborted) {
          this.interimTranscript = "";
        }

        const combinedText = wasAborted
          ? this.finalTranscript.trim()
          : (
              this.finalTranscript +
              (this.interimTranscript ? (this.finalTranscript ? " " : "") + this.interimTranscript : "")
            ).trim();

        if (typeof onEnd === "function") {
          onEnd({
            finalTranscript: this.finalTranscript,
            interimTranscript: this.interimTranscript,
            combinedText,
            aborted: wasAborted
          });
        }
      };

      this.recognition.start();
      return true;
    } catch (err) {
      this.isStarting = false;
      this.isListening = false;
      this.isStopping = false;
      const friendlyMsg = getFriendlySpeechErrorMessage(err.message || "start-failed", true);
      if (typeof onError === "function") {
        onError(friendlyMsg, "start-failed");
      }
      return false;
    }
  }

  stop() {
    if (!this.recognition || (!this.isListening && !this.isStarting) || this.isStopping) {
      return;
    }
    this.isStopping = true;
    try {
      this.recognition.stop();
    } catch {
      this.isStopping = false;
      this.isListening = false;
      this.isStarting = false;
    }
  }

  abort() {
    this.abortedIntentionally = true;
    this.interimTranscript = "";
    if (!this.recognition) {
      this.isStarting = false;
      this.isListening = false;
      this.isStopping = false;
      return;
    }
    try {
      this.recognition.abort();
    } catch {
      // Ignore if already aborted
    } finally {
      this.isStarting = false;
      this.isListening = false;
      this.isStopping = false;
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
