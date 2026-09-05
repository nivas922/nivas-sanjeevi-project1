import React from "react";
import { BookOpen, CheckCircle, FileText } from "lucide-react";

export const SummaryViewer = ({ summary }) => {
  if (!summary) return null;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">{summary.topic || summary.bookTitle}</h2>
        <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">
          Language: {summary.language?.toUpperCase()} • {summary.difficulty || "Academic"}
        </p>
      </div>

      <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
        <p>{summary.summaryText || summary.summary_text}</p>
      </div>

      {summary.simpleExplanation && (
        <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-100">
          <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-1">Simple Explanation</h4>
          <p className="text-sm text-slate-700">{summary.simpleExplanation}</p>
        </div>
      )}
    </div>
  );
};
export default SummaryViewer;
