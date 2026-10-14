import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  BookOpen,
  ChevronDown
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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlBookId = searchParams.get("bookId") || searchParams.get("book_id");

  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(urlBookId || "all");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("All");

  // Load user's uploaded textbooks on mount
  useEffect(() => {
    let isMounted = true;
    api.getTextbooks()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setBooks(data);
        }
      })
      .catch((err) => {
        console.warn("Failed to load textbooks in recommendations:", err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync selectedBookId with URL query params
  useEffect(() => {
    if (urlBookId && urlBookId !== selectedBookId) {
      setSelectedBookId(urlBookId);
    } else if (!urlBookId && selectedBookId !== "all") {
      // Keep selectedBookId in sync
    }
  }, [urlBookId]);

  const fetchAnalytics = async (bookIdToFetch = selectedBookId) => {
    setLoading(true);
    setError(null);
    const targetBookId = bookIdToFetch === "all" ? null : bookIdToFetch;

    try {
      const data = await api.getLearningAnalytics(targetBookId);
      setAnalytics(data);
    } catch (err) {
      console.warn("Analytics fetch failed, falling back to adaptive endpoint:", err.message);
      try {
        const fallbackData = await api.getAdaptiveLearning(targetBookId);
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
    fetchAnalytics(selectedBookId);
  }, [selectedBookId]);

  const handleBookChange = (e) => {
    const newBookId = e.target.value;
    setSelectedBookId(newBookId);
    // Immediately clear current analytics to avoid showing stale data from previous book
    setAnalytics(null);
    if (newBookId === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ bookId: newBookId });
    }
  };

  const topicPerformance = analytics?.topicPerformance || [];
  const strongestTopics = analytics?.strongestTopics || topicPerformance.filter((t) => t.classification === "strong");
  const inProgressTopics = analytics?.inProgressTopics || topicPerformance.filter((t) => t.classification === "in_progress");
  const needsImprovementTopics = analytics?.needsImprovementTopics || topicPerformance.filter((t) => t.classification === "needs_improvement");
  const progressOverTime = analytics?.progressOverTime || { direction: "not_enough_data", history: [] };
  const learningPathSteps = analytics?.orderedLearningPath || analytics?.learningPath || [];
  const provisionalSuggestions = analytics?.provisionalSuggestions || [];
  const hasHistory = topicPerformance.length > 0 || (analytics?.overview?.totalQuizzesTaken > 0);
  const isProvisional = analytics?.isProvisional || (!hasHistory && provisionalSuggestions.length > 0);
  const isEmptyDocument = Boolean(analytics?.emptyDocument);

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
      if (step.topic && step.topic !== "Adaptive Assessment" && step.topic !== "Adaptive Review") {
        params.append("topic", step.topic);
      }
      if (step.difficulty) params.append("difficulty", step.difficulty);
      navigate(`/quiz?${params.toString()}`);
    } else {
      navigate("/quiz");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header Banner - Preserving Purple Gradient & LearnAI Aesthetics */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-brand-900 rounded-3xl p-6 sm:p-8 text-white shadow-soft-lg space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold border border-white/15">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Adaptive Learning Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              AI-Powered Learning Analytics & Recommendations
            </h1>
            <p className="text-sm text-purple-100 leading-relaxed max-w-2xl">
              Adaptive analysis across all educational subjects (Computer Science, Mathematics, Physics, Chemistry, Biology, History, and more). Receive personalized study roadmaps derived from your textbooks and quiz performance.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-start lg:self-auto w-full lg:w-auto">
            {/* Textbook Selector Dropdown */}
            <div className="relative flex-1 sm:w-64">
              <label htmlFor="textbook-select" className="sr-only">Select Textbook</label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-purple-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="textbook-select"
                  value={selectedBookId}
                  onChange={handleBookChange}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/15 hover:bg-white/20 border border-white/25 text-white text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40 transition-all backdrop-blur-md"
                >
                  <option value="all" className="bg-slate-900 text-white font-normal">
                    📚 All Textbooks (Overview)
                  </option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900 text-white font-normal">
                      📖 {b.title} ({b.subject || "Textbook"})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-purple-200 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => fetchAnalytics(selectedBookId)}
              className="bg-white/15 text-white hover:bg-white/25 border-white/20 backdrop-blur-sm shadow-soft-xs"
            >
              Refresh
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
            onClick={() => fetchAnalytics(selectedBookId)}
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
      ) : isEmptyDocument ? (
        /* Empty / Unusable Document State */
        <div className="p-8 sm:p-12 rounded-3xl bg-amber-50/60 border border-amber-200 text-center space-y-4 max-w-2xl mx-auto shadow-soft-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-soft-xs">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              No Usable Text Extracted
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {analytics?.emptyDocumentMessage || "This textbook contains no usable extracted text. Please upload a valid text-based PDF or document to generate recommendations."}
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={BookOpen}
            onClick={() => navigate("/upload")}
            className="bg-amber-600 hover:bg-amber-700 text-white shadow-soft-sm"
          >
            Upload Valid Textbook
          </Button>
        </div>
      ) : !hasHistory ? (
        /* Zero Quiz History State (with Provisional Guidance if Textbook is Selected) */
        <div className="space-y-8">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50 to-brand-50 border border-purple-200/80 shadow-soft-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-soft-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Provisional Learning Roadmap
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Awaiting Quiz Data
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                  {analytics?.provisionalMessage || "No quiz attempts recorded for this textbook yet. Below are provisional study recommendations derived from the book's extracted chapters. Take an adaptive quiz to unlock real-time topic mastery tracking."}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={Zap}
              onClick={() => {
                if (selectedBookId && selectedBookId !== "all") {
                  navigate(`/quiz?bookId=${encodeURIComponent(selectedBookId)}`);
                } else {
                  navigate("/quiz");
                }
              }}
              className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white shadow-soft-sm"
            >
              Take Diagnostic Quiz
            </Button>
          </div>

          {/* Provisional Diagnostic Suggestions Grid */}
          {provisionalSuggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Recommended Starting Topics
                  </h3>
                  <p className="text-xs text-slate-500">
                    Extracted from this textbook's chapters to jumpstart your learning curve.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {provisionalSuggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-soft-xs hover:shadow-soft-sm transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          {sug.badge || "Diagnostic Topic"}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          {sug.estimatedMinutes} mins
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {sug.topic}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {sug.reason}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Zap}
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (sug.bookId) params.append("bookId", sug.bookId);
                        params.append("topic", sug.topic);
                        params.append("difficulty", sug.recommendedDifficulty || "Intermediate");
                        navigate(`/quiz?${params.toString()}`);
                      }}
                      className="w-full bg-slate-900 hover:bg-purple-700 text-white"
                    >
                      Take Diagnostic Quiz
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provisional Learning Path Steps */}
          {learningPathSteps.length > 0 && (
            <section>
              <PersonalizedLearningPath
                steps={learningPathSteps}
                onAction={handleLearningPathAction}
              />
            </section>
          )}

          {provisionalSuggestions.length === 0 && learningPathSteps.length === 0 && (
            <EmptyState
              icon={Sparkles}
              title="Complete quizzes to see your learning analysis"
              description="The adaptive analytics engine tracks your accuracy per topic, classifies your mastery, detects knowledge gaps, and designs a personalized study roadmap once you complete quizzes."
              actionText="Take a Quiz"
              onAction={() => navigate(selectedBookId !== "all" ? `/quiz?bookId=${selectedBookId}` : "/quiz")}
            />
          )}
        </div>
      ) : (
        /* Confirmed Learning Analytics & Real History */
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
