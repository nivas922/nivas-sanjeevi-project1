import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings as SettingsIcon,
  User,
  Globe,
  Layers,
  Volume2,
  Bell,
  Moon,
  LogOut,
  Save,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLearning } from "../context/LearningContext";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";
import { SUPPORTED_LANGUAGES } from "../data/demoData";

export const Settings = () => {
  const { user, updateProfile, logout } = useAuth();
  const { activeLanguage, setActiveLanguage } = useLearning();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.name || "Alex Johnson",
    email: user?.email || "alex.johnson@university.edu",
    role: user?.role || "Computer Science Undergrad",
    preferredDifficulty: user?.preferredDifficulty || "Intermediate",
    speechRate: user?.speechRate || 1.0,
    notifications: user?.notifications !== undefined ? user.notifications : true
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateProfile(formData);
    showSuccess("Settings and preferences successfully updated!");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Account & Learning Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize your profile, AI tutoring difficulty, multilingual preferences, and speech synthesis settings.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <User className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">Student Profile</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover ring-4 ring-brand-50 shadow-soft-sm"
            />
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-base font-bold text-slate-900">{formData.name}</h4>
              <p className="text-xs text-slate-500">{formData.email}</p>
              <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700">
                {formData.role}
              </span>
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
          </div>
        </div>

        {/* AI & Language Preferences */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Globe className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900">Learning Preferences</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Preferred Language */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Default Indian / Global Language
              </label>
              <select
                value={activeLanguage}
                onChange={(e) => setActiveLanguage(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name} ({lang.native})
                  </option>
                ))}
              </select>
            </div>

            {/* Preferred Difficulty */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                AI Summary Baseline Difficulty
              </label>
              <select
                value={formData.preferredDifficulty}
                onChange={(e) => setFormData({ ...formData, preferredDifficulty: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Beginner">Beginner (Foundations & Analogies)</option>
                <option value="Intermediate">Intermediate (Standard Academic)</option>
                <option value="Advanced">Advanced (Rigorous Proofs)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Text-to-Speech & Notifications */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Volume2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Speech & System Notifications</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-500" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Adaptive Learning Notifications
                  </h4>
                  <p className="text-xs text-slate-500">
                    Receive daily study streak reminders and weak topic diagnostic alerts
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.notifications}
                onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
                className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <Button
            variant="danger"
            size="md"
            icon={LogOut}
            onClick={handleLogout}
          >
            Sign Out
          </Button>

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
