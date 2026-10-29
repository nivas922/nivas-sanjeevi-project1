import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings as SettingsIcon,
  User,
  Save,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  School,
  Target,
  Clock,
  TrendingUp,
  CheckCircle2,
  BarChart2,
  Calendar
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";
import { DEPARTMENTS } from "../data/translations";
import { storageService } from "../services/storageService";
import { api } from "../services/api";
import { getLocalDateString } from "../services/studyTracker";

export const Settings = () => {
  const { user, updateProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [formData, setFormData] = useState({
    name: user?.name || "Student",
    email: user?.email || "student@university.edu",
    role: user?.role || user?.department || DEPARTMENTS[0],
    department: user?.department || user?.role || DEPARTMENTS[0],
    dailyStudyTargetMinutes: user?.dailyStudyTargetMinutes || 30
  });

  const [studyStats, setStudyStats] = useState({
    todayMinutes: 0,
    todaySeconds: 0,
    weeklyData: []
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      const localDate = getLocalDateString();
      const localStats = storageService.getStudyStats(user?.id, localDate);
      if (isMounted) {
        setStudyStats(localStats);
      }

      try {
        const apiStats = await api.getStudySessions(localDate);
        if (isMounted && apiStats) {
          setStudyStats({
            todayMinutes: apiStats.todayMinutes ?? localStats.todayMinutes,
            todaySeconds: apiStats.todaySeconds ?? localStats.todaySeconds,
            weeklyData: apiStats.weeklyData && apiStats.weeklyData.length > 0 ? apiStats.weeklyData : localStats.weeklyData
          });
        }
      } catch {
        // Fallback to local stats if api fails
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleImageFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Please select a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError("Image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setAvatarPreview(base64);
      updateProfile({ avatar: base64 });
      showSuccess("Profile picture updated from file manager/gallery!");
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAvatar = () => {
    const aiAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=ai_student_${Math.random().toString(36).substring(7)}`;
    setAvatarPreview(aiAvatar);
    updateProfile({ avatar: aiAvatar });
    showSuccess("New AI Avatar generated!");
  };

  const handleSave = (e) => {
    e.preventDefault();
    const rawTarget = parseInt(formData.dailyStudyTargetMinutes, 10);
    const targetMins = isNaN(rawTarget) || rawTarget < 5 ? 30 : Math.min(rawTarget, 480);

    updateProfile({
      ...user,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      department: formData.department,
      dailyStudyTargetMinutes: targetMins,
      avatar: avatarPreview
    });
    setFormData((prev) => ({ ...prev, dailyStudyTargetMinutes: targetMins }));
    showSuccess("Settings & study goals successfully saved!");
  };

  const targetMins = parseInt(formData.dailyStudyTargetMinutes, 10) || 30;
  const todayMins = studyStats.todayMinutes || 0;
  const completionPercentage = Math.min(100, Math.round((todayMins / targetMins) * 100));
  const remainingMins = Math.max(0, targetMins - todayMins);

  const weeklyList = studyStats.weeklyData && studyStats.weeklyData.length > 0
    ? studyStats.weeklyData
    : [];
  const maxWeeklyMins = Math.max(60, targetMins, ...weeklyList.map((d) => d.minutes || 0));
  const weeklyTotalMins = weeklyList.reduce((acc, d) => acc + (d.minutes || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Account & Learning Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload custom profile pictures, update your department, and set student study targets and goals.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile & Photo Upload Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <User className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">Student Profile & Photo</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <img
                src={avatarPreview || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-brand-100 shadow-soft-md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-slate-900/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">Upload</span>
              </button>
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Upload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload from Gallery / Files
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  icon={Sparkles}
                  onClick={handleGenerateAvatar}
                >
                  Generate AI Avatar
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                Supports JPG, PNG, WEBP, or SVG (Max 5MB)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Department / Role Dropdown */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                <School className="w-3.5 h-3.5 text-brand-600" />
                <span>Department / Departmental Role</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value, role: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Study Goals & Progress */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Target className="w-5 h-5 text-brand-600" />
              <h3 className="text-base font-bold text-slate-900">Study Goals & Progress</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
              <Clock className="w-3.5 h-3.5" />
              <span>Real-Time Tracking Active</span>
            </div>
          </div>

          {/* Actual Study Time & Progress Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Today's Study Time */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Today's Study Time</span>
                <Clock className="w-4 h-4 text-brand-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900" id="actual-today-study-time">
                  {todayMins}
                </span>
                <span className="text-xs font-semibold text-slate-500">minutes</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Active time recorded today
              </p>
            </div>

            {/* Card 2: Daily Goal */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Daily Goal</span>
                <Target className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900" id="actual-daily-goal-target">
                  {targetMins}
                </span>
                <span className="text-xs font-semibold text-slate-500">minutes</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Saved daily target
              </p>
            </div>

            {/* Card 3: Remaining / Status */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Remaining to Goal</span>
                {remainingMins === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                {remainingMins === 0 ? (
                  <span className="text-xl sm:text-2xl font-extrabold text-emerald-600">
                    Goal Achieved!
                  </span>
                ) : (
                  <>
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900" id="actual-remaining-minutes">
                      {remainingMins}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">minutes left</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {remainingMins === 0 ? "Daily target accomplished today 🎉" : `${completionPercentage}% of daily goal completed`}
              </p>
            </div>
          </div>

          {/* Progress Bar & Completion Percentage */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Daily Goal Progress</span>
              <span className="font-extrabold text-brand-600" id="actual-completion-percentage">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden">
              <div
                className="bg-brand-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>{todayMins} mins studied</span>
              <span>
                {remainingMins > 0 ? `${remainingMins} mins remaining` : "Target completed"}
              </span>
            </div>
          </div>

          {/* Weekly Study-Time Chart (Last 7 Days) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-brand-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Weekly Study Time (Last 7 Days)
                </h4>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Total: <strong className="text-slate-800">{weeklyTotalMins} mins</strong>
              </span>
            </div>

            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
              <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-40 pt-4 pb-2 border-b border-slate-200">
                {weeklyList.map((day) => {
                  const barHeightPct = maxWeeklyMins > 0
                    ? Math.max(4, Math.round((day.minutes / maxWeeklyMins) * 100))
                    : 4;
                  return (
                    <div key={day.date} className="flex flex-col items-center h-full justify-end group">
                      {/* Minutes tag above bar */}
                      <span className="text-[10px] font-bold text-slate-500 mb-1 group-hover:text-brand-600 transition-colors">
                        {day.minutes}m
                      </span>
                      {/* Bar */}
                      <div className="w-full max-w-[36px] bg-slate-200 rounded-t-lg relative flex items-end overflow-hidden" style={{ height: "100%" }}>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            day.isToday
                              ? "bg-brand-600 shadow-soft-xs"
                              : day.minutes > 0
                              ? "bg-brand-400 group-hover:bg-brand-500"
                              : "bg-slate-300/50"
                          }`}
                          style={{ height: `${barHeightPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day Labels */}
              <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-2">
                {weeklyList.map((day) => (
                  <div key={day.date} className="text-center">
                    <p className={`text-xs font-bold ${day.isToday ? "text-brand-600" : "text-slate-700"}`}>
                      {day.dayLabel}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {day.formattedDate}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Study Target Input & Quick Goal Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Daily Study Target (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                value={formData.dailyStudyTargetMinutes}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, dailyStudyTargetMinutes: val === "" ? "" : Number(val) });
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="30"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Target daily time dedicated to reading summaries, reviewing notes, and taking quizzes.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Quick Goal Presets
              </label>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {[15, 30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setFormData({ ...formData, dailyStudyTargetMinutes: mins })}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      Number(formData.dailyStudyTargetMinutes) === mins
                        ? "bg-brand-600 text-white border-brand-600 shadow-soft-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Click a preset to quickly set your daily target.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Save}
            className="px-8 shadow-soft-md"
          >
            Save All Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
