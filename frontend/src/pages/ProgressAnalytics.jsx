import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  Award,
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { StatCard } from "../components/common/StatCard";
import { ProgressBar } from "../components/common/ProgressBar";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { api } from "../services/api";

export const ProgressAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await api.getAnalytics();
        setAnalytics(data);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="py-20 text-center text-slate-500">
        Loading analytics dashboard...
      </div>
    );
  }

  const scoreTrends = [
    { label: "Quiz 1", score: 60, date: "Aug 20" },
    { label: "Quiz 2", score: 70, date: "Aug 22" },
    { label: "Quiz 3", score: 65, date: "Aug 24" },
    { label: "Quiz 4", score: 75, date: "Aug 26" },
    { label: "Quiz 5", score: 85, date: "Aug 27" },
    { label: "Quiz 6", score: 78, date: "Aug 28" },
    { label: "Quiz 7", score: 90, date: "Aug 29" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Progress & Performance Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track knowledge retention, learning velocity, and adaptive mastery metrics across your subjects.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Sparkles}
          onClick={() => navigate("/recommendations")}
        >
          View AI Recommendations
        </Button>
      </div>

      {/* 4 Core Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Overall Average"
          value={`${analytics.stats.averageScore}%`}
          subtitle="Top 15% of class"
          icon={Award}
          trend="+8%"
          trendPositive={true}
          colorScheme="brand"
        />
        <StatCard
          title="Quizzes Taken"
          value={analytics.stats.quizzesCompleted}
          subtitle="100% evaluated"
          icon={HelpCircle}
          colorScheme="purple"
        />
        <StatCard
          title="Study Time"
          value={`${analytics.stats.totalStudyHours} hrs`}
          subtitle="This semester"
          icon={Clock}
          colorScheme="emerald"
        />
        <StatCard
          title="Active Streak"
          value={`${analytics.stats.streakDays} Days`}
          subtitle="On fire! 🔥"
          icon={Flame}
          colorScheme="rose"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Trend Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Score Trends Over Time
              </h3>
              <p className="text-xs text-slate-500">Evaluation trajectory across recent adaptive quizzes</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+30% Improvement</span>
            </div>
          </div>

          {/* Clean HTML5/CSS Bar Chart Visualization */}
          <div className="pt-6 pb-2">
            <div className="h-56 flex items-end justify-between gap-3 sm:gap-6 border-b border-slate-200 px-2">
              {scoreTrends.map((point, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  {/* Tooltip on hover */}
                  <span className="text-[11px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-2 py-0.5 rounded-md shadow-soft-sm">
                    {point.score}%
                  </span>
                  
                  {/* Bar */}
                  <div
                    className="w-full max-w-[42px] bg-gradient-to-t from-brand-600 to-indigo-400 rounded-t-xl transition-all duration-500 group-hover:brightness-110 shadow-soft-sm"
                    style={{ height: `${point.score}%` }}
                  />
                  
                  {/* Label */}
                  <span className="text-[11px] font-bold text-slate-500 mt-1">
                    {point.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-semibold mt-2 px-2">
              <span>Earlier Quizzes</span>
              <span>Latest Milestones</span>
            </div>
          </div>
        </div>

        {/* Subject Mastery Radar/Bars (1 col) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Subject Mastery Index
            </h3>
            <p className="text-xs text-slate-500 mb-6">Aggregate syllabus grasp</p>

            <div className="space-y-4">
              {analytics.subjectProgress.map((sub, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{sub.subject}</span>
                    <span>{sub.progress}%</span>
                  </div>
                  <ProgressBar
                    value={sub.progress}
                    size="sm"
                    color={sub.progress >= 80 ? "emerald" : sub.progress >= 65 ? "brand" : "rose"}
                    showLabel={false}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-500 font-medium">
              Average Mastery: <strong className="text-slate-900 font-bold">70%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Strong Topics vs Weak Topics Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strong Topics Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Strong Topics (Mastered)
              </h3>
              <p className="text-xs text-slate-500">Consistent accuracy above 80%</p>
            </div>
          </div>

          <div className="space-y-3">
            {analytics.strongTopics.map((top, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                    {top.name}
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {top.subject}
                  </span>
                </div>
                <span className="text-xs font-black text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-soft-sm">
                  {top.score}% Accuracy
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Topics Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Weak Topics (Action Required)
              </h3>
              <p className="text-xs text-slate-500">Targeted by the Adaptive Recommendation Engine</p>
            </div>
          </div>

          <div className="space-y-3">
            {analytics.weakTopics.map((top, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-rose-950">
                    {top.name}
                  </h4>
                  <span className="text-[11px] font-semibold text-rose-700">
                    {top.subject} • {top.status}
                  </span>
                </div>
                <Button
                  size="xs"
                  variant="danger"
                  onClick={() => navigate("/summaries/sum-1")}
                >
                  Revise Now
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
