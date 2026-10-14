import React, { useState } from "react";
import { BarChart3, Info } from "lucide-react";

export const TopicPerformanceChart = ({
  topicPerformance = [],
  hasSufficientHistory = true
}) => {
  const [hoveredTopic, setHoveredTopic] = useState(null);

  if (!hasSufficientHistory || topicPerformance.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
          <BarChart3 className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">Topic-wise Performance Chart</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Complete quizzes covering your textbook chapters to populate the topic-level performance chart.
        </p>
      </div>
    );
  }

  // Sort by accuracy descending for clear visual ranking
  const sorted = [...topicPerformance].sort((a, b) => b.accuracy - a.accuracy);

  const getBarColor = (accuracy) => {
    if (accuracy >= 80) return "bg-emerald-500";
    if (accuracy >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getTextColor = (accuracy) => {
    if (accuracy >= 80) return "text-emerald-700 font-bold";
    if (accuracy >= 50) return "text-amber-700 font-bold";
    return "text-rose-700 font-bold";
  };

  const getStatusLabel = (accuracy, isProvisional) => {
    if (isProvisional) return "Provisional";
    if (accuracy >= 80) return "Strong";
    if (accuracy >= 50) return "In Progress";
    return "Needs Improvement";
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <span>Topic-wise Performance Overview</span>
          </h3>
          <p className="text-xs text-slate-500">
            Comparative accuracy breakdown across all evaluated curriculum topics.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Strong (≥80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>In Progress (50-79%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Needs Imp (&lt;50%)</span>
          </div>
        </div>
      </div>

      {/* Chart Bars */}
      <div className="space-y-4 pt-2">
        {sorted.map((t, idx) => {
          const isHovered = hoveredTopic === t.topic;
          return (
            <div
              key={t.topic || idx}
              className="space-y-1.5 group"
              onMouseEnter={() => setHoveredTopic(t.topic)}
              onMouseLeave={() => setHoveredTopic(null)}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-slate-800 truncate" title={t.topic}>
                    {t.topic}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    ({t.correctCount}/{t.totalQuestions} correct)
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] ${getTextColor(t.accuracy)}`}>
                    {t.accuracy}%
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hidden sm:inline">
                    {getStatusLabel(t.accuracy, t.isProvisional)}
                  </span>
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(t.accuracy)} ${
                    isHovered ? "brightness-110" : ""
                  }`}
                  style={{ width: `${Math.max(4, t.accuracy)}%` }}
                />
              </div>

              {/* Tooltip / detail note on hover */}
              {isHovered && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/60 animate-in fade-in duration-150">
                  <span className="font-semibold text-slate-700">{t.explanation}</span>
                  {t.isProvisional && (
                    <span className="block text-amber-700 font-medium mt-0.5">
                      Provisional classification based on {t.totalQuestions} questions.
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
