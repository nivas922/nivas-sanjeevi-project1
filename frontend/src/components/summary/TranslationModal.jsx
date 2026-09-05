import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Globe, Volume2, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "../common/Button";
import { TextToSpeech } from "../tts/TextToSpeech";
import { SUPPORTED_LANGUAGES } from "../../data/demoData";
import { api } from "../../services/api";

export const TranslationModal = ({
  isOpen,
  onClose,
  summary = null
}) => {
  const [selectedLang, setSelectedLang] = useState("ta");
  const [loading, setLoading] = useState(false);
  const [translatedData, setTranslatedData] = useState(null);

  useEffect(() => {
    if (summary && isOpen) {
      loadTranslation(selectedLang);
    }
  }, [summary, selectedLang, isOpen]);

  const loadTranslation = async (langCode) => {
    if (!summary) return;
    setLoading(true);
    try {
      const res = await api.translateSummary(summary.id, langCode);
      setTranslatedData(res.translation);
    } finally {
      setLoading(false);
    }
  };

  if (!summary) return null;

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_LANGUAGES[1];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🌐 Multilingual Translation: ${currentLangObj.name} (${currentLangObj.native})`}
      subtitle={`AI Translation for "${summary.topic}"`}
      maxWidth="max-w-3xl"
      footer={
        <Button onClick={onClose} variant="primary">
          Done
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Language Tabs */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
            Select Indian Language:
          </label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  selectedLang === lang.code
                    ? "bg-brand-600 text-white shadow-soft-sm scale-105"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name} ({lang.native})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Translation Content */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-800">Translating to {currentLangObj.name}...</p>
            <p className="text-xs text-slate-500 mt-1">Applying neural machine translation (MarianMT / IndicTrans2)</p>
          </div>
        ) : translatedData ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Translated Summary */}
            <div className="p-5 rounded-2xl bg-brand-50/50 border border-brand-100">
              <h5 className="text-xs font-bold uppercase tracking-wider text-brand-900 mb-2">
                📖 Translated AI Summary ({currentLangObj.name})
              </h5>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                {translatedData.summaryText}
              </p>
            </div>

            {/* Translated Simple Explanation */}
            {translatedData.simpleExplanation && (
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
                  💡 Simplified Explanation ({currentLangObj.name})
                </h5>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {translatedData.simpleExplanation}
                </p>
              </div>
            )}

            {/* Key Points */}
            {translatedData.keyPoints && translatedData.keyPoints.length > 0 && (
              <div className="p-5 rounded-2xl bg-white border border-slate-200">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">
                  📌 Key Points ({currentLangObj.name})
                </h5>
                <ul className="space-y-2">
                  {translatedData.keyPoints.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Text to speech in translated language */}
            <div className="pt-2">
              <TextToSpeech
                text={`${translatedData.summaryText} ${translatedData.simpleExplanation || ""}`}
                title={`Listen in ${currentLangObj.name} (${currentLangObj.native})`}
                initialLang={selectedLang}
                compact={false}
              />
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
