import React from "react";
import { Sparkles, BrainCircuit, CheckCircle2, AlertCircle } from "lucide-react";

export const AiInsightsBanner = ({ aiInsights }) => {
  if (!aiInsights) return null;

  const {
    summary = "",
    gapAnalysis = "",
    studyStrategy = [],
    encouragingNote = "",
    isAiGenerated = true,
    isFallback = false
  } = aiInsights;

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-purple-900/95 via-indigo-900/90 to-brand-900/95 text-white shadow-soft-md relative overflow-hidden space-y-4">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-3">
        {/* Header tag */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Learning Insights & Diagnosis</span>
          </div>

          <span className="text-[11px] font-semibold text-purple-200">
            {isAiGenerated ? "Powered by Google Gemini" : "Deterministic Study Diagnosis"}
          </span>
        </div>

        {/* Diagnostic Summary */}
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
          {summary}
        </h3>

        {/* Gap Analysis & Strategy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Gap Analysis */}
          <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-purple-300" />
              Focus & Concept Remediation
            </span>
            <p className="text-xs text-purple-100 leading-relaxed">
              {gapAnalysis}
            </p>
          </div>

          {/* Study Strategy */}
          <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              Actionable Study Routine
            </span>
            <ul className="text-xs text-purple-100 space-y-1">
              {Array.isArray(studyStrategy) && studyStrategy.map((step, idx) => (
                <li key={idx} className="line-clamp-2">
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Encouraging Note */}
        {encouragingNote && (
          <p className="text-xs text-purple-200/90 italic pt-1 border-t border-white/10">
            "{encouragingNote}"
          </p>
        )}
      </div>
    </div>
  );
};
