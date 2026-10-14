import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  HelpCircle,
  Calendar,
  Award,
  CheckCircle2
} from "lucide-react";

export const LearningTrendChart = ({ progressOverTime }) => {
  const {
    direction = "not_enough_data",
    delta = 0,
    message = "Complete quizzes to track your learning progress over time.",
    history = []
  } = progressOverTime || {};

  const getDirectionBadge = () => {
    if (direction === "improving") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Improving ({delta >= 0 ? `+${delta}%` : `${delta}%`})</span>
        </span>
      );
    }
    if (direction === "declining") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200">
          <TrendingDown className="w-4 h-4 text-rose-600" />
          <span>Declining ({delta}%)</span>
        </span>
      );
    }
    if (direction === "consistent") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Consistent Performance</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
        <HelpCircle className="w-4 h-4 text-slate-500" />
        <span>Building Profile</span>
      </span>
    );
  };

  if (!history || history.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
          <Clock className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">Learning Progress Over Time</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Take your first quiz to begin tracking your learning progress over time.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>Learning Progress Over Time</span>
          </h3>
          <p className="text-xs text-slate-500">
            Chronological performance trend across completed quiz attempts.
          </p>
        </div>

        {getDirectionBadge()}
      </div>

      {/* Overview Message */}
      <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 text-xs text-purple-900 font-medium">
        {message}
      </div>

      {/* Attempt History Progression */}
      {history.length === 1 ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-center space-y-1.5">
          <p className="text-xs font-bold text-slate-700">Initial Quiz Completed ({history[0].percentage}%)</p>
          <p className="text-xs text-slate-500">
            Complete another quiz to track your progress and evaluate whether your performance is improving over time.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Recent Assessment History:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {history.slice(-4).map((att, idx) => {
              const attemptNumber = history.length - (history.slice(-4).length - idx) + 1;
              const isLatest = idx === history.slice(-4).length - 1;
              return (
                <div
                  key={att.quizId || idx}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isLatest
                      ? "bg-purple-50/50 border-purple-200 shadow-soft-xs"
                      : "bg-slate-50 border-slate-200/70"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 mb-1">
                    <span>Attempt #{attemptNumber}</span>
                    {isLatest && <span className="text-purple-600">Latest</span>}
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    {att.percentage}%
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {att.score}/{att.totalQuestions} Correct
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
