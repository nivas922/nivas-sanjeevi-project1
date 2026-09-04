import React, { useState } from "react";
import { Volume2, VolumeX, Play, Pause, Loader2 } from "lucide-react";
import { api } from "../../services/api";

export const TextToSpeechPlayer = ({ text, language = "en" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleSpeak = async () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    setLoading(true);
    try {
      // Use Web Speech API with voice matching selected language
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === "ta" ? "ta-IN" : language === "hi" ? "hi-IN" : "en-US";
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleSpeak}
      disabled={loading || !text}
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isPlaying ? (
        <>
          <Pause className="w-3.5 h-3.5" />
          <span>Stop Listening</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5" />
          <span>Listen ({language.toUpperCase()})</span>
        </>
      )}
    </button>
  );
};
export default TextToSpeechPlayer;
