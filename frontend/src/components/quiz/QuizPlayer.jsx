import React from "react";
import { CheckCircle2 } from "lucide-react";

export const QuizPlayer = ({ question, index, total, selectedAnswer, onSelectAnswer }) => {
  if (!question) return null;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question {index + 1} of {total}</span>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700">{question.topic || "Core"}</span>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{question.question}</h3>

      <div className="space-y-3">
        {question.options?.map((opt, optIdx) => {
          const isSelected = selectedAnswer === optIdx;
          return (
            <button
              key={optIdx}
              type="button"
              onClick={() => onSelectAnswer(optIdx)}
              className={`w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? "border-brand-500 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700"
              }`}
            >
              <span>{opt}</span>
              {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 ml-2" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default QuizPlayer;
