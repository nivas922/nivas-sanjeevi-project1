import React from "react";
import { Clock, CheckCircle } from "lucide-react";

export const QuizProgress = ({
  currentIndex,
  totalQuestions,
  answeredCount,
  timeLeftSeconds,
  onJumpToQuestion
}) => {
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft-sm mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Progress Status
          </span>
          <p className="text-sm font-extrabold text-slate-900">
            Question {currentIndex + 1} of {totalQuestions}
          </p>
        </div>

        {/* Timer */}
        {timeLeftSeconds !== undefined && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 font-mono text-xs sm:text-sm font-bold text-slate-800 border border-slate-200">
            <Clock className="w-4 h-4 text-brand-600 animate-pulse" />
            <span>Time Left: {formatTime(timeLeftSeconds)}</span>
          </div>
        )}
      </div>

      {/* Main Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-4">
        <div
          className="bg-brand-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Question Selector Bubbles */}
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const isCurrent = currentIndex === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onJumpToQuestion(idx)}
              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                isCurrent
                  ? "bg-brand-600 text-white ring-2 ring-brand-300 ring-offset-1 scale-105 shadow-soft-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
