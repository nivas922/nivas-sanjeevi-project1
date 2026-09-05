import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Download,
  Brain,
  HelpCircle
} from "lucide-react";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { exportService } from "../services/exportService";
import { useToast } from "../context/ToastContext";

export const QuizResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSuccess } = useToast();

  const result = location.state?.result;

  useEffect(() => {
    if (result && result.percentage >= 80) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [result]);

  if (!result) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">No active quiz result found.</h2>
        <Button onClick={() => navigate("/quiz")} variant="primary">
          Take a Quiz
        </Button>
      </div>
    );
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const handleDownload = () => {
    exportService.exportQuizResult(result);
    showSuccess("Quiz result report downloaded!");
  };

  const isStrong = result.percentage >= 80;
  const isWeak = result.percentage < 60;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Score Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-lg">
                Quiz Evaluation
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {result.subject}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {result.quizTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownload}
            >
              Export Report
            </Button>
          </div>
        </div>

        {/* Big Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-100 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 block mb-1">
              Score
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-brand-900">
              {result.score} / {result.totalQuestions}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block mb-1">
              Percentage
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-purple-900">
              {result.percentage}%
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Performance
            </span>
            <Badge variant={result.performanceLevel.toLowerCase()} size="md" className="mt-1">
              {result.performanceLevel}
            </Badge>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Time Taken
            </span>
            <p className="text-lg sm:text-xl font-bold text-slate-800 mt-1 flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-slate-400" />
              {formatTime(result.timeSpentSeconds)}
            </p>
          </div>
        </div>
      </div>

      {/* Adaptive Diagnosis & AI Recommendation Box */}
      <div className={`rounded-3xl p-6 sm:p-8 border shadow-soft-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${
        isWeak
          ? "bg-rose-50/70 border-rose-200 text-rose-950"
          : isStrong
          ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
          : "bg-brand-50/70 border-brand-200 text-brand-950"
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl shrink-0 ${
            isWeak ? "bg-rose-500 text-white" : isStrong ? "bg-emerald-500 text-white" : "bg-brand-600 text-white"
          }`}>
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">
                Adaptive Learning Engine Diagnosis
              </span>
            </div>
            <h3 className="text-lg font-bold">
              {isWeak
                ? `Topic "${result.topic}" marked as Weak Topic`
                : isStrong
                ? `Topic "${result.topic}" Mastered!`
                : `Good Progress in "${result.topic}"`}
            </h3>
            <p className="text-xs sm:text-sm mt-1 leading-relaxed opacity-90">
              {isWeak
                ? "The system automatically adapted your curriculum. We recommend reviewing the simplified summary and practicing foundational concepts."
                : isStrong
                ? "You scored above 80%! The adaptive engine unlocked advanced challenge questions for this topic."
                : "You demonstrated solid understanding. Practice a few more intermediate questions to cement mastery."}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex flex-wrap items-center gap-3">
          <Button
            variant={isWeak ? "danger" : "primary"}
            size="md"
            icon={BookOpen}
            iconPosition="right"
            onClick={() => navigate("/summaries/sum-1")}
          >
            Study This Topic
          </Button>
        </div>
      </div>

      {/* Detailed Question Review List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 px-1">
          Detailed Question Breakdown & AI Explanations
        </h3>

        {result.answers.map((ans, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-3xl bg-white border transition-all ${
              ans.isCorrect
                ? "border-emerald-200/80 shadow-soft-sm"
                : "border-rose-200/80 shadow-soft-sm"
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">
                  Question {idx + 1}
                </span>
                {ans.isCorrect ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" /> Incorrect
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {ans.topic}
              </span>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-4 leading-relaxed">
              {ans.question}
            </h4>

            {/* User Choice vs Correct Choice */}
            <div className="space-y-2 text-xs sm:text-sm mb-4">
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                ans.isCorrect
                  ? "bg-emerald-50/50 border-emerald-200 text-emerald-950 font-medium"
                  : "bg-rose-50/50 border-rose-200 text-rose-950 font-medium"
              }`}>
                <span>Your Answer: <strong className="font-bold">{ans.userOption}</strong></span>
                {ans.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              </div>

              {!ans.isCorrect && (
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-950 font-medium flex items-center justify-between gap-2">
                  <span>Correct Answer: <strong className="font-bold">{ans.correctOption}</strong></span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
              )}
            </div>

            {/* AI Explanation */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                AI Explanation:
              </span>
              <p className="leading-relaxed">{ans.explanation}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Retake / Next Quiz Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <Button
          variant="outline"
          size="md"
          icon={RotateCcw}
          onClick={() => navigate(`/quiz?id=${result.quizId}`)}
        >
          Retake This Quiz
        </Button>

        <Button
          variant="primary"
          size="md"
          icon={ArrowRight}
          iconPosition="right"
          onClick={() => navigate("/recommendations")}
        >
          Go to AI Recommendations
        </Button>
      </div>
    </div>
  );
};
