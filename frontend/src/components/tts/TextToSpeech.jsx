import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  Languages,
  Gauge,
  Sparkles
} from "lucide-react";
import { speechService } from "../../services/speechService";
import { useToast } from "../../context/ToastContext";
import { SUPPORTED_LANGUAGES } from "../../data/translations";

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
  const [selectedLang, setSelectedLang] = useState(initialLang || "en");
  const [allGroupedVoices, setAllGroupedVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // React to initialLang changes from parent
  useEffect(() => {
    if (initialLang) {
      setSelectedLang(initialLang);
    }
  }, [initialLang]);

  // Load all grouped voice profiles across all 7 languages
  useEffect(() => {
    const updateVoices = () => {
      const grouped = speechService.getAllGroupedVoices();
      setAllGroupedVoices(grouped);

      // Default voice for the active language
      const targetGroup = grouped.find(g => g.langCode === selectedLang) || grouped[0];
      if (targetGroup && targetGroup.voices.length > 0) {
        setSelectedVoiceName(targetGroup.voices[0].name);
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

  const handleVoiceChange = (e) => {
    const chosenName = e.target.value;
    setSelectedVoiceName(chosenName);

    // Find which language group this voice belongs to
    for (const group of allGroupedVoices) {
      const match = group.voices.find(v => v.name === chosenName);
      if (match) {
        setSelectedLang(match.langCode || group.langCode);
        break;
      }
    }
  };

  const handleLanguageTabClick = (langCode) => {
    setSelectedLang(langCode);
    const targetGroup = allGroupedVoices.find(g => g.langCode === langCode);
    if (targetGroup && targetGroup.voices.length > 0) {
      setSelectedVoiceName(targetGroup.voices[0].name);
    }
  };

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

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200 shadow-soft-sm ${className}`}>
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-soft-sm cursor-pointer"
            title="Listen to audio"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Listen ({currentLangObj.name})</span>
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-soft-sm cursor-pointer"
            title="Pause audio"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        )}

        {(isPlaying || isPaused) && (
          <button
            onClick={handleStop}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Stop audio"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        )}

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
    <div className={`bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-soft-sm space-y-4 ${className}`}>
      {/* Header with Title and Playback Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-brand-50 text-brand-600 shadow-soft-xs">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <span>{title || `Audio Speech Narration: ${currentLangObj.name} (${currentLangObj.native})`}</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Multilingual Indian speech synthesizer tailored for {currentLangObj.name}
            </p>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2">
          {isPlaying && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-soft-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              🔊 Reading Aloud in {currentLangObj.name}
            </span>
          )}
          {isPaused && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              ⏸ Paused
            </span>
          )}
          {!isPlaying && !isPaused && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              ⏹ Ready to Play
            </span>
          )}
        </div>
      </div>

      {/* Quick Language Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Languages className="w-3.5 h-3.5 text-brand-600" />
          Language:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageTabClick(lang.code)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedLang === lang.code
                  ? "bg-brand-600 text-white shadow-soft-sm scale-105"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Playback Controls & Voice Profile Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
        {/* Left Column: Play Controls & Speed */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {!isPlaying ? (
              <button
                type="button"
                onClick={handlePlay}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-soft-sm hover:shadow-glow-brand transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isPaused ? "Resume" : `Play Narration (${currentLangObj.name})`}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-soft-sm transition-all cursor-pointer"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStop}
              disabled={!isPlaying && !isPaused}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Presets */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              Speed:
            </span>
            <div className="flex flex-wrap gap-1">
              {speedOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRate(s)}
                  className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    rate === s
                      ? "bg-brand-600 text-white shadow-soft-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: ALL LANGUAGES Grouped Voice Profile Selector */}
        {showVoiceSelector && (
          <div className="lg:col-span-6 space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>Voice Profile (All Languages Available):</span>
              </span>
              <span className="text-[11px] font-extrabold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                {currentLangObj.flag} {currentLangObj.name} Active
              </span>
            </label>

            <select
              value={selectedVoiceName}
              onChange={handleVoiceChange}
              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-soft-xs cursor-pointer"
            >
              {allGroupedVoices.map((group) => (
                <optgroup
                  key={group.langCode}
                  label={`${group.flag} ${group.langName}`}
                  className="font-bold text-slate-900 bg-slate-100"
                >
                  {group.voices.map((v, i) => (
                    <option
                      key={`${group.langCode}-${i}`}
                      value={v.name}
                      className="font-normal text-slate-800 bg-white"
                    >
                      {v.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
