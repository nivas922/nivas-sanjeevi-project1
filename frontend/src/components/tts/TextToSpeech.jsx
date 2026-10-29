import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  Languages,
  Gauge,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2
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
  variant = "default",
  className = ""
}) => {
  const { showWarning, showError } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
  const [rate, setRate] = useState(1.0);
  const [selectedLang, setSelectedLang] = useState(initialLang || "en");
  const [allGroupedVoices, setAllGroupedVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [playbackMode, setPlaybackMode] = useState(null);
  const [playbackVoiceLabel, setPlaybackVoiceLabel] = useState("");

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // Stop playback when parent text changes so next play reads the latest text
  useEffect(() => {
    speechService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
    setPlaybackMode(null);
    setPlaybackError(null);
  }, [text]);

  // React to initialLang changes from parent
  useEffect(() => {
    if (initialLang) {
      speechService.stop();
      setIsPlaying(false);
      setIsPaused(false);
      setIsLoading(false);
      setPlaybackMode(null);
      setPlaybackError(null);
      setSelectedLang(initialLang);
    }
  }, [initialLang]);

  // Load and listen for voice profile changes from the browser
  useEffect(() => {
    const updateVoices = () => {
      const grouped = speechService.getAllGroupedVoices();
      setAllGroupedVoices(grouped);

      const targetGroup = grouped.find((g) => g.langCode === selectedLang);
      if (targetGroup && targetGroup.voices.length > 0) {
        // If current selected voice is not in the new language, default to first available
        const currentValid = targetGroup.voices.some((v) => v.name === selectedVoiceName);
        if (!currentValid) {
          setSelectedVoiceName(targetGroup.voices[0].name);
        }
      } else {
        setSelectedVoiceName("");
      }
    };

    updateVoices();

    const unsubscribe = speechService.onVoicesChanged(() => {
      updateVoices();
    });

    return () => {
      unsubscribe();
      speechService.stop();
    };
  }, [selectedLang]);

  const handleVoiceChange = (e) => {
    const chosenName = e.target.value;
    setSelectedVoiceName(chosenName);

    // Find which language group this voice belongs to
    for (const group of allGroupedVoices) {
      const match = group.voices.find((v) => v.name === chosenName);
      if (match) {
        setSelectedLang(match.langCode || group.langCode);
        break;
      }
    }
  };

  const handleLanguageChange = (langCode) => {
    speechService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
    setPlaybackMode(null);
    setPlaybackError(null);
    setSelectedLang(langCode);

    const targetGroup = allGroupedVoices.find((g) => g.langCode === langCode);
    if (targetGroup && targetGroup.voices.length > 0) {
      setSelectedVoiceName(targetGroup.voices[0].name);
    } else {
      setSelectedVoiceName("");
    }
  };

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];
  const bcp47 = speechService.getBcp47Code(selectedLang);
  const hasBrowserVoice = speechService.hasVoiceForLanguage(selectedLang);

  const handlePlay = async () => {
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

    setPlaybackError(null);
    setIsLoading(true);

    try {
      await speechService.speak({
        text,
        lang: selectedLang,
        rate,
        voiceName: selectedVoiceName,
        onStart: (info) => {
          setIsLoading(false);
          setIsPlaying(true);
          setIsPaused(false);
          setPlaybackMode(info?.mode || "browser");
          setPlaybackVoiceLabel(info?.voice || "");
        },
        onPause: () => {
          setIsLoading(false);
          setIsPaused(true);
          setIsPlaying(false);
        },
        onResume: () => {
          setIsLoading(false);
          setIsPaused(false);
          setIsPlaying(true);
        },
        onEnd: () => {
          setIsLoading(false);
          setIsPlaying(false);
          setIsPaused(false);
          setPlaybackMode(null);
        },
        onError: (err) => {
          setIsLoading(false);
          setIsPlaying(false);
          setIsPaused(false);
          setPlaybackMode(null);
          const errorMsg =
            err?.code === "VOICE_UNAVAILABLE"
              ? `A voice for ${currentLangObj.name} (${bcp47}) is not installed on this system. Audio cannot be played using an English voice. Please install the ${currentLangObj.name} language and speech pack in Windows Settings.`
              : err?.message || "Audio playback error occurred.";
          setPlaybackError(errorMsg);
          showError(errorMsg);
        }
      });
    } catch (err) {
      setIsLoading(false);
      setIsPlaying(false);
      setIsPaused(false);
      setPlaybackError(err?.message || "Failed to start audio playback.");
    }
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
    setIsLoading(false);
    setPlaybackMode(null);
  };

  const handleReset = () => {
    speechService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
    setPlaybackMode(null);
    setPlaybackError(null);
    setRate(1.0);
  };

  // Compact inline pill variant (e.g. within summary modals)
  if (compact || variant === "compact") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200 shadow-soft-sm ${className}`}
      >
        {!isPlaying ? (
          <button
            type="button"
            onClick={handlePlay}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-soft-sm cursor-pointer disabled:opacity-50"
            title={`Listen in ${currentLangObj.name} (${bcp47})`}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Listen ({currentLangObj.name})</span>
          </button>
        ) : (
          <button
            type="button"
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
            type="button"
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
          {speedOptions.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Compact Speech Narration section embedded directly inside the Translated Text Box
  if (variant === "translated-box") {
    const targetVoices = speechService.getVoicesForLanguage(selectedLang);
    return (
      <div className={`mt-3 pt-3 border-t border-slate-100 space-y-3 ${className}`}>
        {/* Header & Status Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isPlaying
                  ? "bg-brand-600 text-white shadow-soft-xs animate-pulse"
                  : "bg-brand-50 text-brand-600"
              }`}
            >
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Speech Narration
              </span>
              <p className="text-[11px] text-slate-400 font-medium">
                Audio voice reading for {currentLangObj.name} ({bcp47})
              </p>
            </div>
          </div>

          {/* Live Status Badge */}
          <div className="flex items-center gap-1.5">
            {isLoading && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                <Loader2 className="w-3 h-3 animate-spin text-brand-600" />
                <span>Preparing speech...</span>
              </span>
            )}
            {!isLoading && isPlaying && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 animate-pulse shadow-soft-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {playbackMode === "backend"
                  ? `🔊 Cloud Audio (${currentLangObj.name})`
                  : `🔊 Playing (${currentLangObj.name})`}
              </span>
            )}
            {!isLoading && isPaused && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                ⏸ Paused
              </span>
            )}
            {!isLoading && !isPlaying && !isPaused && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                {hasBrowserVoice ? (
                  <span>⏹ Ready ({bcp47})</span>
                ) : (
                  <span className="text-emerald-700 font-semibold">☁️ Cloud Audio Ready</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Error message if any */}
        {playbackError && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between gap-2 animate-in fade-in">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-medium text-[11px] leading-snug">{playbackError}</p>
            </div>
            <button
              type="button"
              onClick={() => setPlaybackError(null)}
              className="text-rose-500 hover:text-rose-800 text-xs font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Playback Controls & Speed Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button
                type="button"
                onClick={handlePlay}
                disabled={isLoading || !text || text.trim() === ""}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-soft-xs hover:shadow-soft-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={`Play audio narration in ${currentLangObj.name}`}
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{isPaused ? "Resume" : "Play Narration"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-soft-xs transition-all cursor-pointer"
                title="Pause audio narration"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStop}
              disabled={!isPlaying && !isPaused && !isLoading}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs border border-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-soft-xs"
              title="Stop audio narration"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          </div>

          {/* Speed Presets */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Speed:
            </span>
            {speedOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRate(s)}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  rate === s
                    ? "bg-brand-600 text-white shadow-soft-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Speech Language & Voice Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
          {/* Speech Language Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Languages className="w-3 h-3 text-brand-600" />
              <span>Speech Language:</span>
            </label>
            <select
              value={selectedLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-soft-xs cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name} ({l.native})
                </option>
              ))}
            </select>
          </div>

          {/* Voice Profile Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-600" />
                <span>Voice:</span>
              </span>
              {!hasBrowserVoice && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Cloud TTS Active
                </span>
              )}
            </label>
            <select
              value={selectedVoiceName}
              onChange={handleVoiceChange}
              disabled={targetVoices.length === 0}
              className={`w-full p-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-soft-xs ${
                targetVoices.length > 0
                  ? "bg-white border-slate-200 text-slate-800 cursor-pointer"
                  : "bg-slate-100 border-slate-200 text-slate-500 italic cursor-not-allowed"
              }`}
            >
              {targetVoices.length > 0 ? (
                targetVoices.map((v, i) => (
                  <option key={i} value={v.name}>
                    {v.name}
                  </option>
                ))
              ) : (
                <option value="">
                  ☁️ Authentic {currentLangObj.name} AI Cloud Voice
                </option>
              )}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-soft-sm space-y-4 ${className}`}
    >
      {/* Header with Title and Playback Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-brand-50 text-brand-600 shadow-soft-xs">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <span>
                {title ||
                  `Audio Speech Narration: ${currentLangObj.name} (${currentLangObj.native})`}
              </span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Multilingual Indian speech synthesizer tailored for {currentLangObj.name} ({bcp47})
            </p>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
              <span>Preparing speech...</span>
            </span>
          )}
          {!isLoading && isPlaying && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-soft-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {playbackMode === "backend"
                ? `🔊 Reading Aloud via Cloud Audio (${currentLangObj.name} - ${bcp47})`
                : `🔊 Reading Aloud in ${currentLangObj.name} (${playbackVoiceLabel || bcp47})`}
            </span>
          )}
          {!isLoading && isPaused && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              ⏸ Paused
            </span>
          )}
          {!isLoading && !isPlaying && !isPaused && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {hasBrowserVoice ? (
                <span>⏹ Ready to Play ({bcp47})</span>
              ) : (
                <span>☁️ Cloud Audio Ready ({bcp47})</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Voice Availability Warning Notice */}
      {!hasBrowserVoice && (
        <div className="rounded-2xl bg-amber-50/90 border border-amber-200/90 p-4 space-y-2 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 w-full">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900">
                  Notice: Browser voice for {currentLangObj.name} ({bcp47}) is not locally installed
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300">
                  Cloud TTS Active
                </span>
              </div>
              <p className="text-amber-800 leading-relaxed font-medium">
                Your browser or operating system does not have a local {currentLangObj.name} Text-to-Speech voice installed. To prevent incorrect English voice playback, audio will narrate using authentic {currentLangObj.name} ({bcp47}) Cloud Speech.
              </p>
              <div className="pt-1 text-[11px] text-amber-800/90 space-y-0.5 bg-amber-100/60 p-2.5 rounded-xl border border-amber-200/60">
                <p className="font-bold text-amber-900">
                  How to install the local {currentLangObj.name} voice pack on Windows:
                </p>
                <p>
                  1. Open Windows <strong>Settings → Time &amp; Language → Language &amp; Region</strong>.
                </p>
                <p>
                  2. Click <strong>Add a language</strong>, choose <strong>{currentLangObj.name}</strong>, and check <strong>Text-to-speech</strong>.
                </p>
                <p>
                  3. Alternatively, launch this app in <strong>Microsoft Edge</strong> (which includes Indian language voices out-of-the-box).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
              onClick={() => handleLanguageChange(lang.code)}
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
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-soft-sm hover:shadow-glow-brand transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                <span>
                  {isPaused
                    ? "Resume"
                    : `Play Narration (${currentLangObj.name} - ${bcp47})`}
                </span>
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
              disabled={!isPlaying && !isPaused && !isLoading}
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
                <span>Voice Profile:</span>
              </span>
              <span className="text-[11px] font-extrabold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                {currentLangObj.flag} {currentLangObj.name} ({bcp47})
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
                  label={`${group.flag} ${group.langName} (${group.bcp47})`}
                  className="font-bold text-slate-900 bg-slate-100"
                >
                  {group.voices.length > 0 ? (
                    group.voices.map((v, i) => (
                      <option
                        key={`${group.langCode}-${i}`}
                        value={v.name}
                        className="font-normal text-slate-800 bg-white"
                      >
                        {v.name}
                      </option>
                    ))
                  ) : (
                    <option
                      key={`${group.langCode}-none`}
                      value=""
                      disabled
                      className="font-normal text-slate-400 italic bg-white"
                    >
                      (No browser voice installed - uses Cloud Audio)
                    </option>
                  )}
                </optgroup>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
