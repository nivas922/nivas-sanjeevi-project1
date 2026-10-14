import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Info,
  BookOpen,
  HelpCircle,
  ShieldCheck
} from "lucide-react";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { ProgressBar } from "../common/ProgressBar";

export const TopicPerformanceCard = ({
  topic,
  category = "strong",
  onAction
}) => {
  const {
    topic: topicName,
    accuracy = 0,
    totalQuestions = 0,
    correctCount = 0,
    incorrectCount = 0,
    attempts = 1,
    trend = "stable",
    isProvisional = false,
    evidenceExplanation = "",
    recommendedDifficulty = "Intermediate",
    explanation = "",
    nextAction = "",
    mistakes = [],
    hasDifficultyData = false,
    difficultyBreakdown = null
  } = topic;

  const isStrong = category === "strong";
  const isInProgress = category === "in_progress";
  const isWeak = category === "needs_improvement";

  const getTheme = () => {
    if (isStrong) {
      return {
        cardBg: "bg-white border-emerald-200/90 hover:border-emerald-300",
        headerBadge: "bg-emerald-100 text-emerald-800 border-emerald-200",
        headerBadgeText: "Strong Mastery",
        barColor: "emerald",
        actionBtnVariant: "primary",
        actionBtnText: "Practise Advanced Questions"
      };
    }
    if (isInProgress) {
      return {
        cardBg: "bg-white border-amber-200/90 hover:border-amber-300",
        headerBadge: "bg-amber-100 text-amber-800 border-amber-200",
        headerBadgeText: "In Progress",
        barColor: "amber",
        actionBtnVariant: "primary",
        actionBtnText: "Practise Questions"
      };
    }
    return {
      cardBg: "bg-white border-rose-200/90 hover:border-rose-300",
      headerBadge: "bg-rose-100 text-rose-800 border-rose-200",
      headerBadgeText: "Needs Improvement",
      barColor: "rose",
      actionBtnVariant: "danger",
      actionBtnText: "Review Revision Summary"
    };
  };

  const theme = getTheme();

  const renderTrend = () => {
    if (trend === "improving") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Improving Trend</span>
        </span>
      );
    }
    if (trend === "declining") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Declining Trend</span>
        </span>
      );
    }
    if (trend === "consistently_strong") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Consistently Strong</span>
        </span>
      );
    }
    if (trend === "mixed") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
          <Clock className="w-3.5 h-3.5" />
          <span>Fluctuating</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
        <span>Stable / Single Attempt</span>
      </span>
    );
  };

  return (
    <div
      className={`rounded-2xl p-5 border transition-all duration-200 shadow-soft-sm hover:shadow-soft-md flex flex-col justify-between ${theme.cardBg}`}
    >
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${theme.headerBadge}`}>
              {theme.headerBadgeText}
            </span>
            {isProvisional ? (
              <span
                className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1"
                title="Classified based on limited questions. Take more quizzes to confirm mastery."
              >
                <Info className="w-3 h-3 text-slate-400" />
                Provisional
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Confirmed
              </span>
            )}
          </div>
          {renderTrend()}
        </div>

        {/* Title & Accuracy Bar */}
        <div>
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <h4 className="text-base font-bold text-slate-900 truncate" title={topicName}>
              {topicName}
            </h4>
            <span className="text-lg font-black text-slate-900 shrink-0">
              {accuracy}%
            </span>
          </div>

          <ProgressBar
            value={accuracy}
            size="sm"
            color={theme.barColor}
          />
        </div>

        {/* Question & Attempt Stats */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
          <div>
            <span className="block text-[10px] font-semibold uppercase text-slate-400">Answered</span>
            <span className="text-xs font-bold text-slate-700">{totalQuestions} qns</span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase text-slate-400">Correct</span>
            <span className="text-xs font-bold text-emerald-600">{correctCount}</span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase text-slate-400">
              {isStrong ? "Attempts" : "Incorrect"}
            </span>
            <span className={`text-xs font-bold ${isStrong ? "text-slate-700" : "text-rose-600"}`}>
              {isStrong ? `${attempts} attempts` : incorrectCount}
            </span>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-xs text-slate-600 leading-relaxed">
          {explanation}
        </p>

        {/* Mistake Pattern if identified */}
        {mistakes && mistakes.length > 0 && isWeak && (
          <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100 text-xs text-rose-800 space-y-1">
            <span className="font-bold flex items-center gap-1 text-[11px] text-rose-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Focus Concept:
            </span>
            <p className="text-[11px] text-rose-700 line-clamp-2">
              {mistakes[0]?.concept}
            </p>
          </div>
        )}

        {/* Difficulty Breakdown if present */}
        {hasDifficultyData && difficultyBreakdown && (
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium">
            <span className="font-bold text-slate-400">Level Perf:</span>
            {difficultyBreakdown.easy && (
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                Easy: {difficultyBreakdown.easy.accuracy}%
              </span>
            )}
            {difficultyBreakdown.medium && (
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                Med: {difficultyBreakdown.medium.accuracy}%
              </span>
            )}
            {difficultyBreakdown.hard && (
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                Hard: {difficultyBreakdown.hard.accuracy}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Recommended Action Footer */}
      <div className="pt-4 mt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="text-[11px] text-slate-500 leading-tight">
          <span className="font-bold text-slate-700 block">Next Action:</span>
          <span className="line-clamp-1">{nextAction}</span>
        </div>

        <Button
          size="sm"
          variant={theme.actionBtnVariant}
          icon={ArrowRight}
          iconPosition="right"
          className="shrink-0 w-full sm:w-auto justify-center"
          onClick={() => onAction(topic)}
        >
          {theme.actionBtnText}
        </Button>
      </div>
    </div>
  );
};
