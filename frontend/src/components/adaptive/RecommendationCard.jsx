import React from "react";
import { Sparkles, ArrowRight, Clock, BookOpen, HelpCircle } from "lucide-react";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";

export const RecommendationCard = ({
  recommendation,
  onStartLearning,
  compact = false
}) => {
  const isWeak = recommendation.urgency === "High" || recommendation.badge?.includes("Weak");

  return (
    <div
      className={`rounded-2xl p-5 border transition-all duration-200 hover:shadow-soft-md ${
        isWeak
          ? "bg-rose-50/40 border-rose-200/80 hover:border-rose-300"
          : "bg-white border-slate-200/80 hover:border-brand-300 shadow-soft-sm"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={isWeak ? "weak" : "brand"}
            size="sm"
            icon={Sparkles}
          >
            {recommendation.badge || "AI Recommendation"}
          </Badge>
          <span className="text-xs font-semibold text-slate-500">{recommendation.subject}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{recommendation.estimatedMinutes} mins</span>
        </div>
      </div>

      <h4 className="text-base font-bold text-slate-900 mb-2">
        {recommendation.topic}
      </h4>

      <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
        {recommendation.reason}
      </p>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Level:</span>
          <span className="text-xs font-bold text-slate-700">{recommendation.recommendedDifficulty}</span>
        </div>

        <Button
          size="sm"
          variant={isWeak ? "danger" : "primary"}
          icon={ArrowRight}
          iconPosition="right"
          onClick={() => onStartLearning(recommendation)}
        >
          Start Learning
        </Button>
      </div>
    </div>
  );
};
