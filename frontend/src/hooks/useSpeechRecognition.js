import { useState, useEffect, useRef, useCallback } from "react";
import {
  SpeechRecognitionService,
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

  // Each hook instance manages its own dedicated SpeechRecognitionService
  const serviceRef = useRef(null);
  if (!serviceRef.current) {
    serviceRef.current = new SpeechRecognitionService();
  }

  const isListeningRef = useRef(false);
  const onCompleteRef = useRef(null);
  const onTranscriptChangeRef = useRef(null);

  // Synchronize isListeningRef with isListening state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Unmount-only cleanup: abort only when component unmounts and this instance was actively listening
  useEffect(() => {
    const service = serviceRef.current;
    return () => {
      if (isListeningRef.current && service) {
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
        onEnd: ({ finalTranscript: finalTxt, interimTranscript: interimTxt, combinedText, aborted }) => {
          setIsListening(false);
          setInterimTranscript("");

          // On intentional abort, do not output interim speech or invoke completion
          if (aborted) {
            return;
          }

          const capturedSpeech = combinedText || finalTxt || interimTxt || "";
          const resultText = initialText
            ? (capturedSpeech ? `${initialText} ${capturedSpeech}`.trim() : initialText)
            : capturedSpeech;

          if (capturedSpeech) {
            setFinalTranscript(capturedSpeech);
            setTranscript(resultText);
          }

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
