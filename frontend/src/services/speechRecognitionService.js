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
  bn: "bn-IN"
};

export const getSpeechLocale = (langCode = "en") => {
  if (!langCode) return "en-IN";
  const normalized = String(langCode).toLowerCase().trim();
  return SPEECH_LOCALE_MAP[normalized] || "en-IN";
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
    this.abortedIntentionally = false;
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

    // Guard against rapid duplicate clicks while starting or already listening
    if (this.isStarting || this.isListening) {
      return false;
    }

    this.isStarting = true;
    this.abortedIntentionally = false;
    this.finalTranscript = "";
    this.interimTranscript = "";

    try {
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
        if (typeof onStart === "function") {
          onStart();
        }
      };

      this.recognition.onresult = (event) => {
        let currentInterim = "";
        let newFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptChunk = result[0]?.transcript || "";
          if (result.isFinal) {
            newFinal += (newFinal ? " " : "") + transcriptChunk.trim();
          } else {
            currentInterim += (currentInterim ? " " : "") + transcriptChunk;
          }
        }

        if (newFinal) {
          this.finalTranscript = (
            this.finalTranscript + (this.finalTranscript ? " " : "") + newFinal
          ).trim();
        }
        this.interimTranscript = currentInterim.trim();

        const combinedText = (
          this.finalTranscript + (this.interimTranscript ? " " + this.interimTranscript : "")
        ).trim();

        if (typeof onTranscript === "function") {
          onTranscript({
            finalTranscript: this.finalTranscript,
            interimTranscript: this.interimTranscript,
            combinedText,
            isFinal: Boolean(newFinal)
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

        const friendlyMsg = getFriendlySpeechErrorMessage(errorCode, true);
        if (typeof onError === "function") {
          onError(friendlyMsg, errorCode);
        }
      };

      this.recognition.onend = () => {
        this.isStarting = false;
        this.isListening = false;
        if (typeof onEnd === "function") {
          onEnd({
            finalTranscript: this.finalTranscript,
            aborted: this.abortedIntentionally
          });
        }
      };

      this.recognition.start();
      return true;
    } catch (err) {
      this.isStarting = false;
      this.isListening = false;
      const friendlyMsg = getFriendlySpeechErrorMessage(err.message || "start-failed", true);
      if (typeof onError === "function") {
        onError(friendlyMsg, "start-failed");
      }
      return false;
    }
  }

  stop() {
    if (!this.recognition || (!this.isListening && !this.isStarting)) {
      return;
    }
    try {
      this.recognition.stop();
    } catch {
      // Ignore if already stopped
    } finally {
      this.isStarting = false;
      this.isListening = false;
    }
  }

  abort() {
    this.abortedIntentionally = true;
    if (!this.recognition) return;
    try {
      this.recognition.abort();
    } catch {
      // Ignore if already aborted
    } finally {
      this.isStarting = false;
      this.isListening = false;
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
