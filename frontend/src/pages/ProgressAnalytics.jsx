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
import { EmptyState } from "../components/common/EmptyState";

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

  const quizHistory = analytics.quizHistory || [];
  const hasQuizHistory = quizHistory.length > 0;
  const subjects = analytics.subjectProgress || [];
  const hasSubjects = subjects.length > 0;

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
          value={`${analytics.stats.averageScore || 0}%`}
          subtitle="Across all quizzes"
          icon={Award}
          trend={hasQuizHistory ? "+5%" : null}
          trendPositive={true}
          colorScheme="brand"
        />
        <StatCard
          title="Quizzes Taken"
          value={analytics.stats.quizzesCompleted || 0}
          subtitle="Evaluations"
          icon={HelpCircle}
          colorScheme="purple"
        />
        <StatCard
          title="Study Time"
          value={`${analytics.stats.totalStudyHours || 0} hrs`}
          subtitle="Active learning"
          icon={Clock}
          colorScheme="emerald"
        />
        <StatCard
          title="Active Streak"
          value={`${analytics.stats.streakDays || 0} Days`}
          subtitle="Daily study rhythm"
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
            {hasQuizHistory && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Active Trajectory</span>
              </div>
            )}
          </div>

          {hasQuizHistory ? (
            <div className="pt-6 pb-2">
              <div className="h-56 flex items-end justify-between gap-3 sm:gap-6 border-b border-slate-200 px-2">
                {quizHistory.map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <span className="text-[11px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-2 py-0.5 rounded-md shadow-soft-sm">
                      {item.percentage}%
                    </span>
                    <div
                      className="w-full max-w-[42px] bg-gradient-to-t from-brand-600 to-indigo-400 rounded-t-xl transition-all duration-500 group-hover:brightness-110 shadow-soft-sm"
                      style={{ height: `${item.percentage}%` }}
                    />
                    <span className="text-[11px] font-bold text-slate-500 mt-1 truncate max-w-[60px]">
                      Q{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-semibold mt-2 px-2">
                <span>Initial Quizzes</span>
                <span>Latest Attempts</span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
              <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">No quiz attempts recorded yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Take an AI quiz on any textbook chapter to visualize your learning score trajectory.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => navigate("/quiz")}
              >
                Take First Quiz
              </Button>
            </div>
          )}
        </div>

        {/* Subject Mastery Index (1 col) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Subject Mastery Index
            </h3>
            <p className="text-xs text-slate-500 mb-6">Increases dynamically as you study each subject</p>

            {hasSubjects ? (
              <div className="space-y-4">
                {subjects.map((sub, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{sub.subject}</span>
                      <span>{sub.progress || 0}%</span>
                    </div>
                    <ProgressBar
                      value={sub.progress || 0}
                      size="sm"
                      color={sub.progress >= 80 ? "emerald" : sub.progress >= 50 ? "brand" : "rose"}
                      showLabel={false}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-xs font-semibold text-slate-500">No subjects added</p>
                <p className="text-[11px] text-slate-400 mt-1">Upload a textbook to start tracking subjects.</p>
              </div>
            )}
          </div>

          {hasSubjects && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <span className="text-xs text-slate-500 font-medium">
                Overall Syllabus Mastery: <strong className="text-slate-900 font-bold">
                  {Math.round((subjects.reduce((acc, curr) => acc + (curr.progress || 0), 0) / subjects.length))}%
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
