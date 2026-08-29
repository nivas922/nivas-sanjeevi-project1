import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Brain,
  Filter,
  ArrowRight,
  Clock,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Zap
} from "lucide-react";
import { useLearning } from "../context/LearningContext";
import { RecommendationCard } from "../components/adaptive/RecommendationCard";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";

export const AIRecommendations = () => {
  const { recommendations } = useLearning();
  const navigate = useNavigate();

  const [filterSubject, setFilterSubject] = useState("All");

  const filteredRecs = recommendations.filter((rec) => {
    if (filterSubject === "All") return true;
    return rec.subject === filterSubject;
  });

  const handleStartLearning = (rec) => {
    if (rec.actionType === "quiz" && rec.targetQuizId) {
      navigate(`/quiz?id=${rec.targetQuizId}`);
    } else if (rec.targetSummaryId) {
      navigate(`/summaries/${rec.targetSummaryId}`);
    } else {
      navigate("/summaries/sum-1");
    }
  };

  const subjects = ["All", "Computer Networks", "Operating Systems", "Python Programming"];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-brand-900 rounded-3xl p-6 sm:p-8 text-white shadow-soft-lg space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-2 border border-white/15">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Real-Time Adaptive Knowledge Graph</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            AI Personalized Recommendations
          </h1>
          <p className="text-sm text-purple-100 max-w-2xl leading-relaxed">
            The adaptive engine continuously scans your quiz responses, identifies conceptual bottlenecks, and generates custom learning pathways with simplified explanations.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:inline">
          Filter By Subject:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setFilterSubject(sub)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterSubject === sub
                  ? "bg-brand-600 text-white shadow-soft-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      {filteredRecs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecs.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onStartLearning={handleStartLearning}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No recommendations for this subject"
          description="Complete more quizzes or upload new textbooks to generate tailored study recommendations."
          actionText="Take a Quiz"
          onAction={() => navigate("/quiz")}
        />
      )}
    </div>
  );
};
