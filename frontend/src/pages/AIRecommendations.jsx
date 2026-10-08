import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Zap,
  AlertCircle,
  RefreshCw,
  Loader2
} from "lucide-react";
import { api } from "../services/api";
import { RecommendationCard } from "../components/adaptive/RecommendationCard";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";

export const AIRecommendations = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterSubject, setFilterSubject] = useState("All");

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRecommendations();
      setRecommendations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load personalized recommendations.");
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const subjects = [
    "All",
    ...Array.from(new Set(recommendations.map((rec) => rec.subject).filter(Boolean)))
  ];

  const filteredRecs = recommendations.filter((rec) => {
    if (filterSubject === "All") return true;
    return rec.subject === filterSubject;
  });

  const handleStartLearning = (rec) => {
    if (rec.actionType === "quiz") {
      const params = new URLSearchParams();
      if (rec.bookId) params.append("bookId", rec.bookId);
      if (rec.topic) params.append("topic", rec.topic);
      navigate(`/quiz?${params.toString()}`);
    } else if (rec.targetSummaryId) {
      navigate(`/summaries/${rec.targetSummaryId}`);
    } else if (rec.bookId) {
      navigate(`/summaries?bookId=${rec.bookId}`);
    } else {
      navigate("/summaries");
    }
  };

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

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchRecommendations}
            className="border-rose-300 text-rose-700 hover:bg-rose-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          <p className="text-sm font-medium text-slate-600">Analyzing your learning performance...</p>
        </div>
      ) : (
        <>
          {/* Dynamic Filter Tabs */}
          {subjects.length > 2 && (
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
          )}

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
              title={recommendations.length === 0 ? "No personalized recommendations yet" : "No recommendations for this subject"}
              description={recommendations.length === 0
                ? "Complete quizzes to allow the adaptive engine to evaluate your conceptual strengths and generate personalized learning recommendations."
                : "No active recommendations match the selected subject filter."}
              actionText="Take a Quiz"
              onAction={() => navigate("/quiz")}
            />
          )}
        </>
      )}
    </div>
  );
};
