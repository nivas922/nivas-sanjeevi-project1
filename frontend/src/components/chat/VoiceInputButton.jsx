import React from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { SUPPORTED_LANGUAGES } from "../../data/translations";

export const VoiceInputButton = ({
  onTranscriptChange,
  onTranscriptFinal,
  language = "en",
  disabled = false,
  currentValue = "",
  size = "md",
  className = ""
}) => {
  const {
    isSupported,
    isListening,
    error,
    clearError,
    startListening,
    stopListening
  } = useSpeechRecognition();

  const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || {
    name: "English",
    code: "en"
  };

  const handleToggle = () => {
    if (disabled) return;

    if (isListening) {
      stopListening();
    } else {
      clearError();
      const initialText = currentValue ? currentValue.trim() : "";
      startListening({
        lang: language,
        initialText,
        onTranscriptChange: (text) => {
          if (typeof onTranscriptChange === "function") {
            onTranscriptChange(text);
          }
        },
        onComplete: (completedText) => {
          if (typeof onTranscriptFinal === "function") {
            onTranscriptFinal(completedText);
          } else if (typeof onTranscriptChange === "function") {
            onTranscriptChange(completedText);
          }
        }
      });
    }
  };

  const buttonSizeClass =
    size === "sm"
      ? "p-2 rounded-xl text-xs"
      : "px-3.5 py-3 rounded-2xl text-sm";

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
        className={`${buttonSizeClass} bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center transition-all ${className}`}
      >
        <MicOff className={iconSize} />
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        title={
          isListening
            ? "Listening to your voice... Click to stop"
            : `Ask doubt using your voice in ${langObj.name} (${langObj.flag || "🎙️"})`
        }
        className={`${buttonSizeClass} font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
          isListening
            ? "bg-rose-600 hover:bg-rose-700 text-white shadow-soft-md animate-pulse ring-4 ring-rose-200"
            : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-soft-xs hover:border-brand-400 hover:text-brand-600"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
      >
        {isListening ? (
          <>
            <MicOff className={`${iconSize} animate-bounce text-white`} />
            {size !== "sm" && (
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Listening...
              </span>
            )}
          </>
        ) : (
          <Mic className={`${iconSize} text-slate-600 group-hover:text-brand-600`} />
        )}
      </button>

      {/* Inline Warning for Permissions / Errors */}
      {error && (
        <div className="absolute bottom-full right-0 mb-2 w-72 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-soft-md flex items-start gap-2 z-50 animate-in fade-in slide-in-from-bottom-1">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-[11px] leading-snug">{error}</p>
            <p className="text-[10px] text-amber-700">You can always type your question directly.</p>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-amber-500 hover:text-amber-800 text-xs font-bold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
