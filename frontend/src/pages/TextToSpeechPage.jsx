import React, { useState } from "react";
import {
  Volume2,
  Languages,
  Sparkles,
  RotateCcw,
  BookOpen,
  FileText
} from "lucide-react";
import { TextToSpeech } from "../components/tts/TextToSpeech";
import { SUPPORTED_LANGUAGES } from "../data/translations";
import { useToast } from "../context/ToastContext";
import { useLearning } from "../context/LearningContext";

export const TextToSpeechPage = () => {
  const { showSuccess } = useToast();
  const { activeLanguage } = useLearning();

  const samplePassages = [
    {
      title: "English: Transport Layer & TCP Handshake",
      lang: "en",
      text: "The Transmission Control Protocol establishes reliable connections using a three-way handshake: the client sends a SYN packet, the server replies with SYN-ACK, and the client acknowledges with an ACK packet before streaming data."
    },
    {
      title: "தமிழ்: கணினி நெட்வொர்க் மற்றும் TCP கைகுலுக்கல்",
      lang: "ta",
      text: "டிரான்ஸ்மிஷன் கண்ட்ரோல் புரோட்டோகால் (TCP) என்பது ஒரு நம்பகமான, வரிசைப்படுத்தப்பட்ட இணைப்பு சார்ந்த போக்குவரத்து நெறிமுறையாகும். இது மூன்று வழி கைகுலுக்கல் (SYN, SYN-ACK, ACK) மூலம் நம்பகமான இணைப்பை உருவாக்குகிறது."
    },
    {
      title: "हिन्दी: कंप्यूटर नेटवर्क और 3-वे हैंडशेक",
      lang: "hi",
      text: "ट्रांसमिशन कंट्रोल प्रोटोकॉल (TCP) एक कनेक्शन-उन्मुख ट्रांसपोर्ट लेयर प्रोटोकॉल है जो आईपी नेटवर्क के माध्यम से विश्वसनीय, क्रमित और त्रुटि-मुक्त डेटा ट्रांसमिशन प्रदान करता है।"
    },
    {
      title: "తెలుగు: కంప్యూటర్ నెట్‌వర్క్‌లు మరియు TCP",
      lang: "te",
      text: "ట్రాన్స్‌మిషన్ కంట్రోల్ ప్రోటోకాల్ (TCP) అనేది విశ్వసనీయమైన, కనెక్షన్-ఆధారిత ట్రాన్స్‌పోర్ట్ ప్రోటోకాల్. ఇది IP నెట్‌వర్క్ ద్వారా లోపాలు లేని డేటా బదిలీని అందిస్తుంది."
    },
    {
      title: "ಕನ್ನಡ: ಕಂಪ್ಯೂಟರ್ ನೆಟ್‌ವರ್ಕ್ ಮತ್ತು TCP ಪ್ರೋಟೋಕಾಲ್",
      lang: "kn",
      text: "ಟ್ರಾನ್ಸ್‌ಮಿಷನ್ ಕಂಟ್ರೋಲ್ ಪ್ರೋಟೋಕಾಲ್ (TCP) ಒಂದು ವಿಶ್ವಾಸಾರ್ಹ ಮತ್ತು ಸಂಪರ್ಕ-ಆಧಾರಿತ ಸಾರಿಗೆ ಪ್ರೋಟೋಕಾಲ್ ಆಗಿದೆ. ಇದು ಸುರಕ್ಷಿತ ಸಂಪರ್ಕವನ್ನು ಸ್ಥಾಪಿಸುತ್ತದೆ."
    },
    {
      title: "മലയാളം: കമ്പ്യൂട്ടർ നെറ്റ്‌വർക്കും TCP യും",
      lang: "ml",
      text: "ട്രാൻസ്മിഷൻ കൺട്രോൾ പ്രോട്ടോക്കോൾ (TCP) ഒരു കണക്ഷൻ-ഓറിയന്റഡ് ട്രാൻസ്പോർട്ട് പ്രോട്ടോക്കോളാണ്. ഇത് സുരക്ഷിതവും പിശകില്ലാത്തതുമായ ഡാറ്റാ കൈമാറ്റം ഉറപ്പാക്കുന്നു."
    },
    {
      title: "বাংলা: কম্পিউটার নেটওয়ার্ক ও টিসিপি",
      lang: "bn",
      text: "ট্রান্সমিশন কন্ট্রোল প্রোটোকল (TCP) একটি নির্ভরযোগ্য সংযোগ-ভিত্তিক ট্রান্সপোর্ট প্রোটোকল যা আইপি নেটওয়ার্কের মাধ্যমে সঠিক ও সুশৃঙ্খল ডেটা স্থানান্তর নিশ্চিত করে।"
    }
  ];

  const [selectedLang, setSelectedLang] = useState(activeLanguage || "en");
  const [text, setText] = useState(samplePassages.find(p => p.lang === selectedLang)?.text || samplePassages[0].text);

  const handleSelectSample = (sample) => {
    setText(sample.text);
    setSelectedLang(sample.lang);
    showSuccess(`Loaded ${SUPPORTED_LANGUAGES.find(l => l.code === sample.lang)?.name || sample.lang} sample passage!`);
  };

  const handleLanguageChange = (code) => {
    setSelectedLang(code);
    const matchingSample = samplePassages.find(p => p.lang === code);
    if (matchingSample) {
      setText(matchingSample.text);
    }
    showSuccess(`Speech language switched to ${SUPPORTED_LANGUAGES.find(l => l.code === code)?.name}!`);
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-3 border border-brand-200">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Multilingual Speech Studio</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Text to Speech Audio Studio
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Listen to textbook chapters, AI summaries, and study notes in natural Indian languages with adjustable speed.
        </p>
      </div>

      {/* Language Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          Select Speech Language:
        </span>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
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

      {/* Preset Passages Grid */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            Educational Presets in Indian Languages
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {samplePassages.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSample(sample)}
              className={`text-left p-3 rounded-xl border transition-all text-xs font-semibold flex items-center justify-between gap-2 ${
                selectedLang === sample.lang
                  ? "bg-brand-50/80 border-brand-300 text-brand-950 font-bold shadow-soft-sm"
                  : "bg-slate-50 border-slate-200/80 text-slate-800 hover:bg-slate-100"
              }`}
            >
              <span className="truncate">{sample.title}</span>
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-brand-700">
                {sample.lang.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Textarea Input */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>Text to Read Aloud:</span>
            <span className="text-[11px] text-brand-600 font-bold">
              ({currentLangObj.name} - {currentLangObj.native})
            </span>
          </label>
          <button
            onClick={() => setText("")}
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
          >
            Clear Text
          </button>
        </div>

        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Paste or type any textbook text in ${currentLangObj.name} to read aloud...`}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all leading-relaxed"
        />

        {/* Embedded Speech Component */}
        <TextToSpeech
          text={text}
          title={`Audio Controller: ${currentLangObj.name} (${currentLangObj.native})`}
          initialLang={selectedLang}
          showVoiceSelector={true}
          compact={false}
        />
      </div>
    </div>
  );
};
