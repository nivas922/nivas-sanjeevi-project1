import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Languages,
  Gauge
} from "lucide-react";
import { speechService } from "../../services/speechService";
import { useToast } from "../../context/ToastContext";
import { SUPPORTED_LANGUAGES } from "../../data/demoData";

export const TextToSpeech = ({
  text = "",
  title = "",
  initialLang = "en",
  showVoiceSelector = true,
  compact = false,
  className = ""
}) => {
  const { showWarning } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [selectedLang, setSelectedLang] = useState(initialLang);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  useEffect(() => {
    setSelectedLang(initialLang);
  }, [initialLang]);

  useEffect(() => {
    const updateVoices = () => {
      const voices = speechService.getVoices();
      setAvailableVoices(voices);
      const matched = speechService.findVoiceForLanguage(selectedLang);
      if (matched) {
        setSelectedVoiceName(matched.name);
      }
    };

    updateVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      speechService.stop();
    };
  }, [selectedLang]);

  const handlePlay = () => {
    if (!text || text.trim() === "") {
      showWarning("No text available to read.");
      return;
    }

    if (isPaused) {
      speechService.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    speechService.speak({
      text,
      lang: selectedLang,
      rate,
      voiceName: selectedVoiceName,
      onStart: () => {
        setIsPlaying(true);
        setIsPaused(false);
      },
      onPause: () => {
        setIsPaused(true);
        setIsPlaying(false);
      },
      onResume: () => {
        setIsPaused(false);
        setIsPlaying(true);
      },
      onEnd: () => {
        setIsPlaying(false);
        setIsPaused(false);
      },
      onError: () => {
        setIsPlaying(false);
        setIsPaused(false);
      }
    });
  };

  const handlePause = () => {
    speechService.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    speechService.stop();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleReset = () => {
    speechService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setRate(1.0);
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200 shadow-soft-sm ${className}`}>
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-soft-sm"
            title="Listen to audio"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Listen</span>
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-soft-sm"
            title="Pause audio"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        )}

        {(isPlaying || isPaused) && (
          <button
            onClick={handleStop}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Stop audio"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        )}

        {/* Speed pill toggle */}
        <select
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value))}
          className="text-[11px] font-bold bg-white text-slate-700 py-1 px-2 rounded-lg border border-slate-200 focus:outline-none"
        >
          {speedOptions.map(s => (
            <option key={s} value={s}>{s}x</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft-sm ${className}`}>
      {/* Header with Title and Playback Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {title || "AI Speech Synthesis"}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Natural voice narration with speed controls
            </p>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2">
          {isPlaying && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              🔊 Playing
            </span>
          )}
          {isPaused && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              ⏸ Paused
            </span>
          )}
          {!isPlaying && !isPaused && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              ⏹ Stopped
            </span>
          )}
        </div>
      </div>

      {/* Control Buttons and Settings Grid */}
      <div className="space-y-4">
        {/* Playback Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!isPlaying ? (
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-soft-sm hover:shadow-glow-brand transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isPaused ? "Resume" : "Play Narration"}</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-soft-sm transition-all"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all"
            title="Reset to default settings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Speed presets & Language selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          {/* Speed Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              <span>Speech Speed ({rate}x)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {speedOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setRate(s)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    rate === s
                      ? "bg-brand-600 text-white shadow-soft-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selector */}
          {showVoiceSelector && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                <Languages className="w-3.5 h-3.5 text-slate-400" />
                <span>Voice Profile</span>
              </div>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {availableVoices.length === 0 && <option value="">Default System Voice</option>}
                {availableVoices.map((v, i) => (
                  <option key={i} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
