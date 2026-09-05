import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Volume2,
  Globe,
  Sparkles,
  Download,
  Copy,
  Check,
  BookOpen,
  HelpCircle,
  Clock,
  Layers,
  FileCheck2,
  Sliders,
  Edit3
} from "lucide-react";
import { useLearning } from "../context/LearningContext";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { TextToSpeech } from "../components/tts/TextToSpeech";
import { KeyPoints } from "../components/summary/KeyPoints";
import { DefinitionsCard } from "../components/summary/DefinitionsCard";
import { FormulasCard } from "../components/summary/FormulasCard";
import { ExamplesCard } from "../components/summary/ExamplesCard";
import { SimplifyModal } from "../components/summary/SimplifyModal";
import { TranslationModal } from "../components/summary/TranslationModal";
import { exportService } from "../services/exportService";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { SUPPORTED_LANGUAGES } from "../data/translations";

export const SummaryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { summaries, quizzes } = useLearning();
  const { showSuccess } = useToast();

  const [summary, setSummary] = useState(null);
  const [showSimplifyModal, setShowSimplifyModal] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkedRevision, setCheckedRevision] = useState({});

  // Quiz count state (preset or custom)
  const [quizQuestionSelect, setQuizQuestionSelect] = useState("5");
  const [customQuestionCount, setCustomQuestionCount] = useState(8);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  useEffect(() => {
    const found = summaries.find((s) => s.id === id) || summaries[0];
    setSummary(found);
  }, [id, summaries]);

  if (!summary) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">No summary found. Please upload a textbook to generate summaries.</p>
        <Button onClick={() => navigate("/upload")} variant="primary" className="mt-4">
          Upload Textbook
        </Button>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `${summary.topic}\n\nSummary:\n${summary.summaryText}\n\nSimplified Explanation:\n${summary.simpleExplanation}`
    );
    setCopied(true);
    showSuccess("Summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    exportService.exportSummaryAsMarkdown(summary);
    showSuccess("Summary exported as Markdown!");
  };

  const toggleRevisionCheck = (idx) => {
    setCheckedRevision((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const getFinalQuestionCount = () => {
    if (quizQuestionSelect === "custom") {
      const parsed = parseInt(customQuestionCount, 10);
      return isNaN(parsed) || parsed < 1 ? 5 : Math.min(parsed, 30);
    }
    return parseInt(quizQuestionSelect, 10) || 5;
  };

  const handleStartCustomQuiz = async () => {
    setGeneratingQuiz(true);
    const finalCount = getFinalQuestionCount();
    try {
      const newQuiz = await api.generateQuiz({
        textbookId: summary.textbookId,
        summaryId: summary.id,
        topic: summary.topic,
        subject: summary.bookTitle,
        difficulty: summary.difficulty,
        questionCount: finalCount,
        language: summary.language || "en"
      });
      navigate(`/quiz?id=${newQuiz.id}`);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === (summary.language || "en")) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Back button */}
      <button
        onClick={() => navigate("/summaries")}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Summaries</span>
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-md space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-xl">
              {summary.bookTitle}
            </span>
            <Badge variant="brand" size="sm">
              {summary.difficulty || "Intermediate"}
            </Badge>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
              {currentLangObj.flag} {currentLangObj.name}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {summary.readTime || "5 min read"}
            </span>
            <span>•</span>
            <span>Generated {summary.createdDate}</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            {summary.topic}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {summary.chapterTitle}
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="purple"
              size="sm"
              icon={Sparkles}
              onClick={() => setShowSimplifyModal(true)}
            >
              ✨ Explain Simply
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={Globe}
              onClick={() => setShowTranslateModal(true)}
            >
              🌐 Translate Content
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={copied ? Check : Copy}
              onClick={handleCopy}
            >
              {copied ? "Copied" : "Copy"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownload}
            >
              Download (.MD)
            </Button>
          </div>
        </div>
      </div>

      {/* Embedded Multilingual Text-to-Speech Audio Player */}
      <TextToSpeech
        text={`${summary.topic}. ${summary.summaryText}. ${summary.simpleExplanation || ""}`}
        title={`Audio Narration (${currentLangObj.name} - ${currentLangObj.native})`}
        initialLang={summary.language || "en"}
      />

      {/* Main AI Summary Block */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <BookOpen className="w-5 h-5 text-brand-600" />
          <h3 className="text-base font-bold text-slate-900">
            AI Summary ({currentLangObj.name})
          </h3>
        </div>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
          {summary.summaryText}
        </p>

        {summary.simpleExplanation && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block mb-1">
                Beginner Intuition (Explain Simply)
              </span>
              <p className="text-xs sm:text-sm text-amber-950 leading-relaxed font-medium">
                {summary.simpleExplanation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Key Concepts Grid */}
      {summary.keyConcepts && summary.keyConcepts.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Layers className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900">
              Key Concepts & Architecture
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.keyConcepts.map((concept, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2.5"
              >
                <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span>{concept}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Takeaway Key Points */}
      <KeyPoints points={summary.keyPoints} />

      {/* Important Definitions */}
      <DefinitionsCard definitions={summary.definitions} />

      {/* Formulas & Equations */}
      <FormulasCard formulas={summary.formulas} />

      {/* Code Examples */}
      <ExamplesCard examples={summary.examples} />

      {/* Quick Revision Checklist */}
      {summary.quickRevision && summary.quickRevision.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                Quick Revision Checklist
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Exam High-Yield
            </span>
          </div>
          <div className="space-y-2.5">
            {summary.quickRevision.map((rev, idx) => (
              <div
                key={idx}
                onClick={() => toggleRevisionCheck(idx)}
                className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-center gap-3 ${
                  checkedRevision[idx]
                    ? "bg-emerald-50/60 border-emerald-300 text-emerald-950 line-through opacity-75"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(checkedRevision[idx])}
                  onChange={() => {}}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-semibold">{rev}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic AI Quiz Generator CTA with Custom / Preset Question Count Selector */}
      <div className="bg-gradient-to-r from-brand-900 via-indigo-900 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-soft-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block mb-1">
            Adaptive Knowledge Evaluation
          </span>
          <h3 className="text-xl font-bold">
            Ready to test your knowledge on "{summary.topic}"?
          </h3>
          <p className="text-xs sm:text-sm text-brand-200 mt-1 max-w-md">
            Choose preset question count or type any custom number of questions to generate.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <select
              value={quizQuestionSelect}
              onChange={(e) => setQuizQuestionSelect(e.target.value)}
              className="p-3 bg-white/10 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 focus:outline-none"
            >
              <option value="5" className="text-slate-900">5 Questions</option>
              <option value="10" className="text-slate-900">10 Questions</option>
              <option value="15" className="text-slate-900">15 Questions</option>
              <option value="20" className="text-slate-900">20 Questions</option>
              <option value="custom" className="text-slate-900">✍️ Custom Count...</option>
            </select>

            {quizQuestionSelect === "custom" && (
              <input
                type="number"
                min={1}
                max={30}
                value={customQuestionCount}
                onChange={(e) => setCustomQuestionCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                placeholder="Questions"
                className="w-20 p-2.5 bg-white text-slate-900 font-extrabold text-sm rounded-xl border-2 border-amber-400 focus:outline-none"
              />
            )}
          </div>

          <Button
            size="lg"
            variant="purple"
            icon={HelpCircle}
            iconPosition="right"
            loading={generatingQuiz}
            onClick={handleStartCustomQuiz}
            className="bg-white text-brand-900 hover:bg-slate-100 font-bold px-6 shadow-soft-md"
          >
            Start {getFinalQuestionCount()}-Q Quiz
          </Button>
        </div>
      </div>

      {/* Modals */}
      <SimplifyModal
        isOpen={showSimplifyModal}
        onClose={() => setShowSimplifyModal(false)}
        originalText={summary.summaryText}
        simplifiedText={summary.simpleExplanation}
        topic={summary.topic}
      />

      <TranslationModal
        isOpen={showTranslateModal}
        onClose={() => setShowTranslateModal(false)}
        summary={summary}
      />
    </div>
  );
};
