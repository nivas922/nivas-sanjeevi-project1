import React from "react";
import { Badge } from "../common/Badge";
import { ProgressBar } from "../common/ProgressBar";

export const TopicMasteryCard = ({
  topicName,
  subject,
  masteryPercentage,
  status,
  onStudyTopic
}) => {
  const getBadgeVariant = (s) => {
    switch (s?.toLowerCase()) {
      case "strong": return "strong";
      case "good": return "good";
      case "needs improvement": return "needs_improvement";
      case "weak": return "weak";
      default: return "default";
    }
  };

  const getProgressColor = (pct) => {
    if (pct >= 80) return "emerald";
    if (pct >= 65) return "blue";
    if (pct >= 50) return "amber";
    return "rose";
  };

  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-soft-sm flex flex-col justify-between hover:border-brand-200 transition-colors">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <Badge variant={getBadgeVariant(status)} size="sm">
            {status}
          </Badge>
          <span className="text-[11px] font-semibold text-slate-400">{subject}</span>
        </div>
        <h5 className="text-sm font-bold text-slate-900 mb-3">{topicName}</h5>
      </div>

      <div className="space-y-2">
        <ProgressBar
          value={masteryPercentage}
          size="sm"
          color={getProgressColor(masteryPercentage)}
          label="Mastery"
        />
        {onStudyTopic && (
          <button
            onClick={onStudyTopic}
            className="w-full text-center text-xs font-bold text-brand-600 hover:text-brand-700 pt-1"
          >
            Study Topic →
          </button>
        )}
      </div>
    </div>
  );
};
