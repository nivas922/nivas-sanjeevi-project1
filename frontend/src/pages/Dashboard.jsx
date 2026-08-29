import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  HelpCircle,
  Award,
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  TrendingUp,
  Brain
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLearning } from "../context/LearningContext";
import { StatCard } from "../components/common/StatCard";
import { ProgressBar } from "../components/common/ProgressBar";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { storageService } from "../services/storageService";

export const Dashboard = () => {
  const { user } = useAuth();
  const { textbooks, summaries, recommendations } = useLearning();
  const [activities, setActivities] = useState([]);
  const [subjectProgress, setSubjectProgress] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    setActivities(storageService.getActivities());
    setSubjectProgress(storageService.getSubjectProgress());
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const topRecommendation = recommendations && recommendations.length > 0 ? recommendations[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-brand-900 via-brand-800 to-accent-900 rounded-3xl p-6 sm:p-8 text-white shadow-soft-lg relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Adaptive Engine Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            {getGreeting()}, {user?.name || "Student"}! 👋
          </h1>
          <p className="text-brand-100 text-sm sm:text-base mt-2 max-w-xl font-normal leading-relaxed">
            Continue your personalized multilingual textbook learning journey. Your mastery is tracked in real-time.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Button
            variant="purple"
            size="md"
            icon={UploadCloud}
            onClick={() => navigate("/upload")}
            className="shadow-soft-lg"
          >
            Upload Textbook
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={BookOpen}
            onClick={() => navigate("/textbooks")}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            My Library
          </Button>
        </div>
      </div>

      {/* 5 Main Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Books Studied"
          value={textbooks.length}
          subtitle="4 Total Subjects"
          icon={BookOpen}
          colorScheme="brand"
        />
        <StatCard
          title="Summaries Generated"
          value={summaries.length}
          subtitle="AI & Multilingual"
          icon={FileText}
          colorScheme="purple"
        />
        <StatCard
          title="Quizzes Taken"
          value={user?.quizzesTaken || 14}
          subtitle="Adaptive MCQ tests"
          icon={HelpCircle}
          colorScheme="amber"
        />
        <StatCard
          title="Average Score"
          value={`${user?.averageScore || 78}%`}
          subtitle="Across all quizzes"
          icon={Award}
          trend="+5%"
          trendPositive={true}
          colorScheme="emerald"
        />
        <StatCard
          title="Learning Streak"
          value={`${user?.streakDays || 7} Days`}
          subtitle="Keep it going! 🔥"
          icon={Flame}
          colorScheme="rose"
        />
      </div>

      {/* Main Grid: Subject Mastery & AI Recommendation Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Progress Section (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-soft-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Learning Progress by Subject</h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time mastery index computed from quiz scores & completed summaries</p>
              </div>
              <button
                onClick={() => navigate("/progress")}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>Full Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-5">
              {subjectProgress.map((sub, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${sub.color}`} />
                      {sub.subject}
                    </span>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 shadow-soft-sm">
                      {sub.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`${sub.color} h-2.5 rounded-full transition-all duration-700`}
                      style={{ width: `${sub.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Overall Syllabus Completion</span>
            <span className="font-bold text-brand-600">70% Target Reached</span>
          </div>
        </div>

        {/* AI Recommendation Spotlight Card (1 col) */}
        <div className="bg-gradient-to-b from-purple-900 to-indigo-950 rounded-3xl p-6 sm:p-7 text-white shadow-soft-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-purple-500/30 text-purple-200 border border-purple-400/30">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-purple-300">
                  Adaptive Engine
                </span>
                <h4 className="text-sm font-bold text-white">AI Recommendation</h4>
              </div>
            </div>

            {topRecommendation ? (
              <div className="space-y-3">
                <div className="inline-block px-2.5 py-1 rounded-lg bg-rose-500/30 text-rose-200 text-[11px] font-bold border border-rose-400/30">
                  ⚠️ {topRecommendation.badge || "Focus Needed"}
                </div>
                <h3 className="text-lg font-black text-white leading-tight">
                  Focus on {topRecommendation.subject}
                </h3>
                <p className="text-xs text-purple-200 leading-relaxed">
                  {topRecommendation.reason}
                </p>

                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1.5 text-xs">
                  <div className="flex justify-between text-purple-200">
                    <span>Topic:</span>
                    <span className="font-bold text-white">{topRecommendation.topic}</span>
                  </div>
                  <div className="flex justify-between text-purple-200">
                    <span>Est. Time:</span>
                    <span className="font-bold text-white">{topRecommendation.estimatedMinutes} mins</span>
                  </div>
                  <div className="flex justify-between text-purple-200">
                    <span>Target Difficulty:</span>
                    <span className="font-bold text-amber-300">{topRecommendation.recommendedDifficulty}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-purple-200">All topics are in good shape! Take a new quiz to discover new challenge areas.</p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/15">
            <Button
              variant="purple"
              size="md"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => navigate(topRecommendation?.targetSummaryId ? `/summaries/${topRecommendation.targetSummaryId}` : "/recommendations")}
              className="w-full bg-purple-500 hover:bg-purple-400 text-white font-bold"
            >
              Start Recommended Learning
            </Button>
          </div>
        </div>
      </div>

      {/* Lower Row: Recent Activity & Quick Textbook Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Timeline (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-soft-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Learning Activity</h3>
              <p className="text-xs text-slate-500">Your textbook interactions and evaluation milestones</p>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {activities.map((act) => (
              <div key={act.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${act.badgeColor}`}>
                    {act.badge}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">{act.title}</p>
                </div>
                <span className="text-xs font-medium text-slate-400 shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Continue Learning Card (1 col) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-soft-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg">
              Resume Study
            </span>
            <h4 className="text-base font-bold text-slate-900 mt-3 mb-1">
              Computer Networks: Kurose & Ross
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Chapter 3: Transport Layer (TCP vs UDP)
            </p>

            <ProgressBar value={55} size="md" color="brand" label="Chapter Progress" />
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Button
              variant="secondary"
              size="md"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => navigate("/summaries/sum-1")}
              className="w-full"
            >
              Continue from where you stopped
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
