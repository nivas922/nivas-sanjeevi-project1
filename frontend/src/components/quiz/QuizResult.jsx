import React from "react";
import { Award, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

export const QuizResult = ({ result, onRetry }) => {
  if (!result) return null;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
        <Award className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-2xl font-extrabold text-slate-900">{result.percentage}%</h3>
        <p className="text-sm font-bold text-slate-600 mt-1">Performance Level: {result.performanceLevel}</p>
        <p className="text-xs text-slate-400 mt-0.5">Scored {result.score} out of {result.totalQuestions} questions correct</p>
      </div>

      {result.recommendedTopic && (
        <div className="p-4 rounded-2xl bg-purple-50 text-left border border-purple-100">
          <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider">Adaptive Recommendation</h4>
          <p className="text-sm font-bold text-purple-900 mt-1">{result.recommendedTopic}</p>
          <p className="text-xs text-purple-600 mt-0.5">Recommended Difficulty: {result.recommendationDifficulty}</p>
        </div>
      )}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Take Another Quiz</span>
        </button>
      )}
    </div>
  );
};
export default QuizResult;
