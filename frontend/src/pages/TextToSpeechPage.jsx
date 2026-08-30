import React, { useState } from "react";
import {
  Volume2,
  Languages,
  Sparkles,
  RotateCcw,
  BookOpen,
  FileText,
  ArrowRight,
  Globe,
  Loader2,
  ArrowLeftRight,
  Copy,
  Check
} from "lucide-react";
import { TextToSpeech } from "../components/tts/TextToSpeech";
import { SUPPORTED_LANGUAGES, MULTILINGUAL_SUMMARIES } from "../data/translations";
import { translatorService } from "../services/translatorService";
import { useToast } from "../context/ToastContext";
import { useLearning } from "../context/LearningContext";
import { Button } from "../components/common/Button";

export const TextToSpeechPage = () => {
  const { showSuccess } = useToast();
  const { activeLanguage } = useLearning();

  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState(activeLanguage || "ta");

  const [sourceText, setSourceText] = useState(
    "The Transmission Control Protocol (TCP) is a core connection-oriented transport protocol. It ensures reliable, ordered, and error-free communication using a three-way handshake."
  );
  const [translatedText, setTranslatedText] = useState(
    "டிரான்ஸ்மிஷன் கண்ட்ரோல் புரோட்டோகால் (TCP) என்பது ஒரு முதன்மை இணைப்பு சார்ந்த போக்குவரத்து நெறிமுறையாகும். இது மூன்று வழி கைகுலுக்கல் மூலம் நம்பகமான மற்றும் பிழையற்ற தொடர்பை உறுதி செய்கிறது."
  );

  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  const quickPairs = [
    { label: "English ➔ Tamil", source: "en", target: "ta" },
    { label: "English ➔ Hindi", source: "en", target: "hi" },
    { label: "English ➔ Telugu", source: "en", target: "te" },
    { label: "English ➔ Kannada", source: "en", target: "kn" },
    { label: "English ➔ Malayalam", source: "en", target: "ml" },
    { label: "English ➔ Bengali", source: "en", target: "bn" }
  ];

  const handleTranslate = (sLang = sourceLang, tLang = targetLang) => {
    setIsTranslating(true);
    setTimeout(() => {
      const result = translatorService.translateText(sourceText, tLang, sLang);
      setTranslatedText(result);
      setIsTranslating(false);
      const targetName = SUPPORTED_LANGUAGES.find(l => l.code === tLang)?.name || tLang;
      showSuccess(`Successfully translated into ${targetName}!`);
    }, 250);
  };

  const handleSelectPair = (pair) => {
    setSourceLang(pair.source);
    setTargetLang(pair.target);
    handleTranslate(pair.source, pair.target);
  };

  const handleSwapLanguages = () => {
    const tempLang = sourceLang;
    const tempText = sourceText;
    setSourceLang(targetLang);
    setTargetLang(tempLang);
    setSourceText(translatedText);
    setTranslatedText(tempText);
  };

  const handleCopyTranslated = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    showSuccess("Translated text copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const targetLangObj = SUPPORTED_LANGUAGES.find(l => l.code === targetLang) || SUPPORTED_LANGUAGES[1];
  const sourceLangObj = SUPPORTED_LANGUAGES.find(l => l.code === sourceLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-3 border border-brand-200">
          <Languages className="w-3.5 h-3.5" />
          <span>Universal Multilingual Translation & Speech Studio</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Translate from English & Read Aloud in Indian Languages
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Translate textbook notes from English to Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali and listen to authentic audio speech narration.
        </p>
      </div>

      {/* Quick Language Pairs */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          Instant Indian Language Translation Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          {quickPairs.map((pair, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPair(pair)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                targetLang === pair.target && sourceLang === pair.source
                  ? "bg-brand-600 text-white shadow-soft-md scale-105"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{pair.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Translation Toolbar: Source & Target Selectors with Swap */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Source selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">From:</span>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Swap button */}
        <button
          onClick={handleSwapLanguages}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          title="Swap Languages"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        {/* Target selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">To (Indian Language):</span>
          <select
            value={targetLang}
            onChange={(e) => {
              setTargetLang(e.target.value);
              handleTranslate(sourceLang, e.target.value);
            }}
            className="p-2 bg-brand-50 border border-brand-300 rounded-xl text-xs font-bold text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name} ({l.native})
              </option>
            ))}
          </select>
        </div>

        {/* Translate CTA */}
        <Button
          size="sm"
          variant="primary"
          icon={Globe}
          loading={isTranslating}
          onClick={() => handleTranslate()}
          className="w-full sm:w-auto shadow-soft-sm"
        >
          Translate to {targetLangObj.name}
        </Button>
      </div>

      {/* Dual Workspace: Left (Source Text) | Right (Translated Output) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Text Box */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Source Text ({sourceLangObj.name})
              </span>
              <button
                onClick={() => setSourceText("")}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Clear
              </button>
            </div>
            <textarea
              rows={8}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste or type textbook content in English..."
              className="w-full mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all leading-relaxed"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={Globe}
            onClick={() => handleTranslate()}
            className="w-full mt-2"
          >
            🔄 Translate to {targetLangObj.name} ({targetLangObj.native})
          </Button>
        </div>

        {/* Translated Text Box */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 flex items-center gap-1.5">
                <span>{targetLangObj.flag}</span>
                <span>Translated in {targetLangObj.name} ({targetLangObj.native})</span>
              </span>
              <button
                onClick={handleCopyTranslated}
                className="text-xs text-slate-500 hover:text-brand-600 font-semibold flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            {isTranslating ? (
              <div className="h-48 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-200 mt-3">
                <Loader2 className="w-7 h-7 animate-spin text-brand-600 mb-2" />
                <p className="text-xs font-bold text-slate-700">Translating into {targetLangObj.name}...</p>
              </div>
            ) : (
              <textarea
                rows={8}
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                placeholder={`Translated text in ${targetLangObj.name} will appear here...`}
                className="w-full mt-3 p-3 bg-brand-50/40 border border-brand-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all leading-relaxed"
              />
            )}
          </div>

          <div className="pt-2 text-right">
            <span className="text-[11px] font-semibold text-slate-400">
              {translatedText ? `${translatedText.split(/\s+/).filter(Boolean).length} words` : "0 words"}
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Audio Speech Controller for Translated Text */}
      <TextToSpeech
        text={translatedText}
        title={`Audio Speech Narration: ${targetLangObj.name} (${targetLangObj.native})`}
        initialLang={targetLang}
        showVoiceSelector={true}
        compact={false}
      />
    </div>
  );
};
