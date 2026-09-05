import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";

export const RecommendationCard = ({ recommendations = [], onAction }) => {
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-brand-50 to-purple-50 p-6 rounded-2xl border border-brand-100/80 space-y-4">
      <div className="flex items-center gap-2 text-brand-700">
        <Sparkles className="w-4 h-4" />
        <h3 className="text-sm font-bold uppercase tracking-wider">AI Adaptive Recommendations</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.slice(0, 2).map((rec, idx) => (
          <div key={rec.id || idx} className="bg-white p-4 rounded-xl border border-brand-100 shadow-soft-xs space-y-2">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
              {rec.badge || "Diagnostic"}
            </span>
            <h4 className="text-sm font-bold text-slate-900">{rec.topic}</h4>
            <p className="text-xs text-slate-500 line-clamp-2">{rec.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default RecommendationCard;
