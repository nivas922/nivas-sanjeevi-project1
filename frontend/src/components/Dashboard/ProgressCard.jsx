import React from "react";
import { BookOpen, FileText, CheckCircle2, Award } from "lucide-react";

export const ProgressCard = ({ stats }) => {
  const items = [
    { label: "Books Studied", value: stats?.booksStudied || 0, icon: BookOpen, color: "text-brand-600", bg: "bg-brand-50" },
    { label: "Summaries", value: stats?.summariesGenerated || 0, icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Quizzes Taken", value: stats?.quizzesCompleted || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Average Score", value: `${stats?.averageScore || 0}%`, icon: Award, color: "text-amber-600", bg: "bg-amber-50" }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${item.bg} ${item.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{item.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default ProgressCard;
