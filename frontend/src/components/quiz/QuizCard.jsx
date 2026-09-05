import React from "react";
import { Check, HelpCircle } from "lucide-react";
import { Badge } from "../common/Badge";

export const QuizCard = ({
  question,
  questionNumber,
  selectedOptionIndex,
  onSelectOption
}) => {
  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-md animate-in fade-in duration-200">
      {/* Header with question difficulty & topic badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg">
            Question {questionNumber}
          </span>
          <Badge variant={question.difficulty || "intermediate"} size="sm">
            {question.difficulty || "Intermediate"}
          </Badge>
        </div>
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          {question.topic}
        </span>
      </div>

      {/* Question Text */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed mb-6">
        {question.question}
      </h3>

      {/* Options List */}
      <div className="space-y-3">
        {question.options.map((optionText, idx) => {
          const isSelected = selectedOptionIndex === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectOption(idx)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-4 select-none ${
                isSelected
                  ? "bg-brand-50/80 border-brand-500 shadow-soft-sm text-brand-950 font-bold"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-700 font-medium"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span
                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {optionLetters[idx]}
                </span>
                <span className="text-sm leading-relaxed">{optionText}</span>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-soft-sm">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
