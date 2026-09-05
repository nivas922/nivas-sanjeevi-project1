import React from "react";
import { CheckCircle2, Bookmark } from "lucide-react";

export const KeyPoints = ({ points = [] }) => {
  if (!points || points.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft-sm">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
        <Bookmark className="w-4 h-4 text-brand-600" />
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          Key Takeaways & Core Points
        </h4>
      </div>
      <ul className="space-y-3">
        {points.map((point, index) => (
          <li key={index} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-1" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
