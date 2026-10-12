import React, { useState } from "react";
import { Volume2, Pause, Loader2 } from "lucide-react";
import { speechService } from "../../services/speechService";
import { useToast } from "../../context/ToastContext";

export const TextToSpeechPlayer = ({ text, language = "en" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showError } = useToast();

  const handleToggleSpeak = () => {
    if (isPlaying) {
      speechService.stop();
      setIsPlaying(false);
      return;
    }

    if (!text || text.trim() === "") return;

    setLoading(true);
    try {
      speechService.speak({
        text,
        lang: language,
        onStart: () => {
          setIsPlaying(true);
          setLoading(false);
        },
        onEnd: () => {
          setIsPlaying(false);
          setLoading(false);
        },
        onError: (err) => {
          setIsPlaying(false);
          setLoading(false);
          if (err?.code === "VOICE_UNAVAILABLE") {
            showError?.(
              `Speech voice for ${language.toUpperCase()} (${speechService.getBcp47Code(language)}) is not installed on this device.`
            );
          }
        }
      });
    } catch (err) {
      setLoading(false);
      setIsPlaying(false);
    }
  };

  const bcp47 = speechService.getBcp47Code(language);

  return (
    <button
      type="button"
      onClick={handleToggleSpeak}
      disabled={loading || !text}
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
      title={`Listen in ${bcp47}`}
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
