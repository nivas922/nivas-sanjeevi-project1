import React from "react";
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, HelpCircle } from "lucide-react";

export const LearningOverviewCards = ({
  overview,
  hasSufficientHistory = true
}) => {
  const {
    strongTopicsCount = 0,
    inProgressTopicsCount = 0,
    needsImprovementTopicsCount = 0,
    overallProgress = 0,
    totalAnsweredQuestions = 0,
    totalQuizzesTaken = 0
  } = overview || {};

  const cards = [
    {
      title: "Strong Topics",
      value: strongTopicsCount,
      subtext: strongTopicsCount > 0 ? "Accuracy ≥ 80%" : "No strong topics yet",
      icon: CheckCircle2,
      color: "emerald",
      bgClass: "bg-emerald-50/70 border-emerald-200/80 text-emerald-900",
      iconClass: "text-emerald-600 bg-emerald-100",
      badgeClass: "bg-emerald-100 text-emerald-800"
    },
    {
      title: "Topics in Progress",
      value: inProgressTopicsCount,
      subtext: inProgressTopicsCount > 0 ? "Accuracy 50% – 79%" : "None developing",
      icon: Clock,
      color: "amber",
      bgClass: "bg-amber-50/70 border-amber-200/80 text-amber-900",
      iconClass: "text-amber-600 bg-amber-100",
      badgeClass: "bg-amber-100 text-amber-800"
    },
    {
      title: "Topics Needing Improvement",
      value: needsImprovementTopicsCount,
      subtext: needsImprovementTopicsCount > 0 ? "Accuracy < 50%" : "No weak topics",
      icon: AlertTriangle,
      color: "rose",
      bgClass: "bg-rose-50/70 border-rose-200/80 text-rose-900",
      iconClass: "text-rose-600 bg-rose-100",
      badgeClass: "bg-rose-100 text-rose-800"
    },
    {
      title: "Overall Learning Progress",
      value: `${overallProgress}%`,
      subtext: totalQuizzesTaken > 0 ? `${totalQuizzesTaken} completed quizzes (${totalAnsweredQuestions} questions)` : "No quiz attempts yet",
      icon: TrendingUp,
      color: "brand",
      bgClass: "bg-purple-50/70 border-purple-200/80 text-purple-900",
      iconClass: "text-brand-600 bg-purple-100",
      badgeClass: "bg-purple-100 text-brand-800"
    }
  ];

  if (!hasSufficientHistory && totalQuizzesTaken === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
          <HelpCircle className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">Learning Overview</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Complete more quizzes to see your learning analysis, topic classifications, and accuracy metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-5 rounded-2xl border transition-all duration-200 shadow-soft-sm hover:shadow-soft-md ${card.bgClass}`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {card.title}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.iconClass}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight mb-1">
              {card.value}
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
};
