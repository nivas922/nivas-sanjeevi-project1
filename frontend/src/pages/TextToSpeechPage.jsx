import React, { useState } from "react";
import {
  Volume2,
  Languages,
  RotateCcw,
  Sparkles,
  BookOpen,
  FileText,
  Copy,
  Check
} from "lucide-react";
import { TextToSpeech } from "../components/tts/TextToSpeech";
import { SUPPORTED_LANGUAGES } from "../data/demoData";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";

export const TextToSpeechPage = () => {
  const { showSuccess } = useToast();

  const samplePassages = [
    {
      title: "Computer Networks (TCP 3-Way Handshake)",
      lang: "en",
      text: "The Transmission Control Protocol establishes reliable connections using a three-way handshake: the client sends a SYN packet, the server replies with SYN-ACK, and the client acknowledges with an ACK packet before streaming data."
    },
    {
      title: "Tamil Summary Sample (கணினி நெட்வொர்க்)",
      lang: "ta",
      text: "டிரான்ஸ்மிஷன் கண்ட்ரோல் புரோட்டோகால் (TCP) என்பது ஒரு நம்பகமான, வரிசைப்படுத்தப்பட்ட இணைப்பு சார்ந்த போக்குவரத்து நெறிமுறையாகும். இது மூன்று வழி கைகுலுக்கல் (SYN, SYN-ACK, ACK) மூலம் இணைப்பை உருவாக்குகிறது."
    },
    {
      title: "Hindi Summary Sample (ऑपरेटिंग सिस्टम और प्रक्रिया)",
      lang: "hi",
      text: "ट्रांसमिशन कंट्रोल प्रोटोकॉल (TCP) एक कनेक्शन-उन्मुख ट्रांसपोर्ट लेयर प्रोटोकॉल है जो आईपी नेटवर्क के माध्यम से विश्वसनीय और त्रुटि-मुक्त डेटा ट्रांसमिशन प्रदान करता है।"
    },
    {
      title: "Python OOP Encapsulation",
      lang: "en",
      text: "Encapsulation is the bundling of data and the methods that operate on that data into a single unit or class, restricting direct external access to internal state components using double underscore name mangling."
    }
  ];

  const [text, setText] = useState(samplePassages[0].text);
  const [selectedLang, setSelectedLang] = useState("en");

  const handleSelectSample = (sample) => {
    setText(sample.text);
    setSelectedLang(sample.lang);
    showSuccess(`Loaded sample: "${sample.title}"`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
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
          Listen to textbook chapters, AI summaries, and study notes in natural Indian voices with adjustable playback speed.
        </p>
      </div>

      {/* Preset Passages */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            Quick Educational Presets
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {samplePassages.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSample(sample)}
              className="text-left p-3 rounded-xl bg-slate-50 hover:bg-brand-50/70 border border-slate-200/80 hover:border-brand-300 transition-all text-xs font-semibold text-slate-800 flex items-center justify-between gap-2"
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
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Text to Read Aloud:
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
          placeholder="Paste or type any textbook chapter, formula explanations, or study notes here..."
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all leading-relaxed"
        />

        {/* Embedded Speech Component with Full Voice & Speed Controls */}
        <TextToSpeech
          text={text}
          title="Audio Playback Controller"
          initialLang={selectedLang}
          showVoiceSelector={true}
          compact={false}
        />
      </div>
    </div>
  );
};
