import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Zap,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  Compass,
  BarChart3,
  TrendingUp,
  BookOpen
} from "lucide-react";
import { api } from "../services/api";
import { LearningOverviewCards } from "../components/adaptive/LearningOverviewCards";
import { TopicPerformanceCard } from "../components/adaptive/TopicPerformanceCard";
import { TopicPerformanceChart } from "../components/adaptive/TopicPerformanceChart";
import { LearningTrendChart } from "../components/adaptive/LearningTrendChart";
import { PersonalizedLearningPath } from "../components/adaptive/PersonalizedLearningPath";
import { AiInsightsBanner } from "../components/adaptive/AiInsightsBanner";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";

export const AIRecommendations = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("All");

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLearningAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.warn("Analytics fetch failed, falling back to adaptive endpoint:", err.message);
      try {
        const fallbackData = await api.getAdaptiveLearning();
        setAnalytics(fallbackData);
      } catch (fallbackErr) {
        setError(fallbackErr.message || "Failed to load learning analytics.");
        setAnalytics(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const topicPerformance = analytics?.topicPerformance || [];
  const strongestTopics = analytics?.strongestTopics || topicPerformance.filter((t) => t.classification === "strong");
  const inProgressTopics = analytics?.inProgressTopics || topicPerformance.filter((t) => t.classification === "in_progress");
  const needsImprovementTopics = analytics?.needsImprovementTopics || topicPerformance.filter((t) => t.classification === "needs_improvement");
  const progressOverTime = analytics?.progressOverTime || { direction: "not_enough_data", history: [] };
  const learningPathSteps = analytics?.orderedLearningPath || analytics?.learningPath || [];
  const hasHistory = topicPerformance.length > 0 || (analytics?.overview?.totalQuizzesTaken > 0);

  // Filter subjects list
  const subjects = [
    "All",
    ...Array.from(new Set(topicPerformance.map((t) => t.subject || t.topic).filter(Boolean)))
  ];

  const filterTopicList = (list) => {
    if (selectedSubject === "All") return list;
    return list.filter((t) => (t.subject || t.topic) === selectedSubject);
  };

  const handleTopicAction = (topic) => {
    if (topic.actionType === "quiz" || topic.classification === "strong") {
      const params = new URLSearchParams();
      if (topic.bookId) params.append("bookId", topic.bookId);
      if (topic.topic) params.append("topic", topic.topic);
      if (topic.recommendedDifficulty) params.append("difficulty", topic.recommendedDifficulty);
      navigate(`/quiz?${params.toString()}`);
    } else if (topic.actionType === "doubts") {
      navigate(`/doubts?question=${encodeURIComponent(`Explain key concepts of ${topic.topic}`)}`);
    } else if (topic.bookId) {
      navigate(`/summaries?bookId=${encodeURIComponent(topic.bookId)}`);
    } else {
      navigate("/summaries");
    }
  };

  const handleLearningPathAction = (step) => {
    if (step.actionType === "summary") {
      if (step.bookId) {
        navigate(`/summaries?bookId=${encodeURIComponent(step.bookId)}`);
      } else {
        navigate("/summaries");
      }
    } else if (step.actionType === "doubts") {
      navigate("/doubts");
    } else if (step.actionType === "quiz") {
      const params = new URLSearchParams();
      if (step.bookId) params.append("bookId", step.bookId);
      if (step.topic && step.topic !== "Adaptive Assessment") params.append("topic", step.topic);
      if (step.difficulty) params.append("difficulty", step.difficulty);
      navigate(`/quiz?${params.toString()}`);
    } else {
      navigate("/quiz");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header Banner - Preserving Purple Gradient & LearnAI Aesthetics */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-brand-900 rounded-3xl p-6 sm:p-8 text-white shadow-soft-lg space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold border border-white/15">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Adaptive Learning Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              AI-Powered Learning Analytics & Personalized Learning Path
            </h1>
            <p className="text-sm text-purple-100 leading-relaxed max-w-2xl">
              Understand your learning strengths, identify topics that need improvement, track your progress, and receive an AI-powered study plan personalized to your quiz performance.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchAnalytics}
              className="bg-white/15 text-white hover:bg-white/25 border-white/20 backdrop-blur-sm shadow-soft-xs"
            >
              Refresh Analysis
            </Button>
          </div>
        </div>
      </div>

      {/* Error Notification */}
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
            onClick={fetchAnalytics}
            className="border-rose-300 text-rose-700 hover:bg-rose-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-purple-600 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Evaluating your quiz performance & learning history...</p>
          <p className="text-xs text-slate-400">Computing topic accuracies, mistake patterns, and AI study recommendations</p>
        </div>
      ) : !hasHistory ? (
        /* Zero Quiz History State */
        <EmptyState
          icon={Sparkles}
          title="Complete more quizzes to see your learning analysis"
          description="The adaptive analytics engine tracks your accuracy per topic, classifies your mastery, detects knowledge gaps, and designs a personalized study roadmap once you complete quizzes."
          actionText="Take a Quiz"
          onAction={() => navigate("/quiz")}
        />
      ) : (
        <>
          {/* SECTION A: Learning Overview Summary Cards */}
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Performance Snapshot
            </h2>
            <LearningOverviewCards
              overview={analytics?.overview}
              hasSufficientHistory={hasHistory}
            />
          </section>

          {/* AI Insights & Diagnosis Banner */}
          {analytics?.aiInsights && (
            <AiInsightsBanner aiInsights={analytics.aiInsights} />
          )}

          {/* Subject Filter Tabs if multiple subjects exist */}
          {subjects.length > 2 && (
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:inline">
                Filter by Topic / Subject:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {subjects.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedSubject === sub
                        ? "bg-purple-600 text-white shadow-soft-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECTION B: Your Strongest Topics */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Your Strongest Topics
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Demonstrated consistent understanding across quiz attempts (Accuracy ≥ 80%)
              </span>
            </div>

            {filterTopicList(strongestTopics).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filterTopicList(strongestTopics).map((t, idx) => (
                  <TopicPerformanceCard
                    key={t.topic || idx}
                    topic={t}
                    category="strong"
                    onAction={handleTopicAction}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-white border border-dashed border-slate-200 text-center space-y-1">
                <p className="text-xs font-bold text-slate-700">No strong topics classified yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Score 80% or higher across quiz questions to confirm topic mastery and unlock advanced challenges.
                </p>
              </div>
            )}
          </section>

          {/* SECTION C: Topics in Progress */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Topics in Progress
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Partial understanding or developing consistency (Accuracy 50% – 79%)
              </span>
            </div>

            {filterTopicList(inProgressTopics).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filterTopicList(inProgressTopics).map((t, idx) => (
                  <TopicPerformanceCard
                    key={t.topic || idx}
                    topic={t}
                    category="in_progress"
                    onAction={handleTopicAction}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-white border border-dashed border-slate-200 text-center space-y-1">
                <p className="text-xs font-bold text-slate-700">No topics currently in progress</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Topics with partial accuracy will appear here with targeted recommendations to reach full mastery.
                </p>
              </div>
            )}
          </section>

          {/* SECTION D: Topics Needing Improvement */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Topics Needing Improvement
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                High-priority focus areas with opportunities for rapid conceptual growth (Accuracy &lt; 50%)
              </span>
            </div>

            {filterTopicList(needsImprovementTopics).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filterTopicList(needsImprovementTopics).map((t, idx) => (
                  <TopicPerformanceCard
                    key={t.topic || idx}
                    topic={t}
                    category="needs_improvement"
                    onAction={handleTopicAction}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center space-y-1">
                <p className="text-xs font-bold text-emerald-800">Excellent! No topics currently flagged as weak</p>
                <p className="text-xs text-emerald-600 max-w-sm mx-auto">
                  You are performing consistently above 50% across all evaluated curriculum topics.
                </p>
              </div>
            )}
          </section>

          {/* SECTION E: Topic-wise Performance Chart */}
          <section>
            <TopicPerformanceChart
              topicPerformance={topicPerformance}
              hasSufficientHistory={hasHistory}
            />
          </section>

          {/* SECTION F: Learning Progress Over Time */}
          <section>
            <LearningTrendChart
              progressOverTime={progressOverTime}
            />
          </section>

          {/* SECTION G: Your Personalized Learning Path */}
          <section>
            <PersonalizedLearningPath
              steps={learningPathSteps}
              onAction={handleLearningPathAction}
            />
          </section>
        </>
      )}
    </div>
  );
};
