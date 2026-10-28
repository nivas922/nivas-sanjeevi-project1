import { useState, useEffect, useRef, useCallback } from "react";
import {
  speechRecognitionService,
  isSpeechRecognitionSupported,
  getSpeechLocale
} from "../services/speechRecognitionService";

export const useSpeechRecognition = () => {
  const [isSupported] = useState(() => isSpeechRecognitionSupported());
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  const serviceRef = useRef(speechRecognitionService);
  const onCompleteRef = useRef(null);
  const onTranscriptChangeRef = useRef(null);

  // Stop listening and cleanup on unmount
  useEffect(() => {
    const service = serviceRef.current;
    return () => {
      if (service) {
        service.abort();
      }
    };
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setFinalTranscript("");
    setError(null);
    setErrorCode(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  const startListening = useCallback(
    ({ lang = "en", onTranscriptChange, onComplete, initialText = "" } = {}) => {
      clearError();
      onCompleteRef.current = onComplete;
      onTranscriptChangeRef.current = onTranscriptChange;

      const started = serviceRef.current.start({
        lang: getSpeechLocale(lang),
        onStart: () => {
          setIsListening(true);
        },
        onTranscript: ({ finalTranscript: finalTxt, interimTranscript: interimTxt, combinedText }) => {
          setInterimTranscript(interimTxt);
          setFinalTranscript(finalTxt);

          const fullText = initialText
            ? `${initialText} ${combinedText}`.trim()
            : combinedText;

          setTranscript(fullText);

          if (typeof onTranscriptChangeRef.current === "function") {
            onTranscriptChangeRef.current(fullText);
          }
        },
        onError: (friendlyMessage, code) => {
          setIsListening(false);
          setError(friendlyMessage);
          setErrorCode(code);
        },
        onEnd: ({ finalTranscript: finalTxt }) => {
          setIsListening(false);
          setInterimTranscript("");

          const resultText = initialText
            ? `${initialText} ${finalTxt}`.trim()
            : finalTxt;

          if (typeof onCompleteRef.current === "function") {
            onCompleteRef.current(resultText);
          }
        }
      });

      return started;
    },
    [clearError]
  );

  const stopListening = useCallback(() => {
    serviceRef.current.stop();
    setIsListening(false);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    errorCode,
    startListening,
    stopListening,
    resetTranscript,
    clearError
  };
};
