import React from "react";
import { Sliders, HelpCircle } from "lucide-react";

export const QuizConfig = ({ questionCount, onCountChange, onStart, loading }) => {
  const options = [5, 10, 15, 20];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft-sm space-y-4">
      <div className="flex items-center gap-2 text-slate-800">
        <Sliders className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-bold uppercase tracking-wider">Quiz Setup</h3>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-2">Select Number of Questions:</label>
        <div className="flex gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onCountChange(opt)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                questionCount === opt
                  ? "bg-brand-600 text-white shadow-soft-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {opt} Questions
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={loading}
        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading ? "Generating Quiz..." : "Start Adaptive Quiz"}
      </button>
    </div>
  );
};
export default QuizConfig;
