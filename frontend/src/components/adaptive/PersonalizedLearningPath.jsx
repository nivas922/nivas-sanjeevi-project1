import React from "react";
import {
  Compass,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Clock,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Button } from "../common/Button";

export const PersonalizedLearningPath = ({
  steps = [],
  onAction
}) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
          <Compass className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">Personalized Learning Path</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Complete diagnostic quizzes to generate a tailored step-by-step study plan based on your strengths and improvement areas.
        </p>
      </div>
    );
  }

  const getPriorityBadge = (priority) => {
    if (priority === "High") {
      return "bg-rose-100 text-rose-800 border-rose-200";
    }
    if (priority === "Medium") {
      return "bg-amber-100 text-amber-800 border-amber-200";
    }
    return "bg-purple-100 text-purple-800 border-purple-200";
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-4 h-4 text-purple-600" />
            <span>Your Personalized Learning Path</span>
          </h3>
          <p className="text-xs text-slate-500">
            An ordered, actionable study plan dynamically adapted to your real quiz performance.
          </p>
        </div>
        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 self-start sm:self-auto">
          Adaptive Roadmap
        </span>
      </div>

      <div className="space-y-4">
        {steps.map((item, idx) => {
          return (
            <div
              key={item.step || idx}
              className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-purple-200 transition-all duration-200 shadow-soft-xs hover:shadow-soft-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                {/* Step Circle Badge */}
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-soft-xs">
                  {item.step || idx + 1}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {item.title}
                    </h4>
                    {item.priority && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(item.priority)}`}>
                        {item.priority} Priority
                      </span>
                    )}
                    {item.estimatedEffort && (
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.estimatedEffort}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.reason}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                    <span className="font-semibold text-slate-700">
                      Activity: <span className="font-normal text-slate-600">{item.suggestedActivity}</span>
                    </span>
                    {item.currentPerformance && (
                      <span className="text-slate-400">
                        • Status: <span className="text-slate-700 font-semibold">{item.currentPerformance}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full md:w-auto shrink-0 pt-2 md:pt-0">
                <Button
                  size="sm"
                  variant={item.priority === "High" ? "danger" : "primary"}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="w-full md:w-auto justify-center"
                  onClick={() => onAction(item)}
                >
                  {item.actionText || "Get Started"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
