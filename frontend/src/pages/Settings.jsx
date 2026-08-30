import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings as SettingsIcon,
  User,
  Globe,
  Layers,
  Volume2,
  Bell,
  LogOut,
  Save,
  Camera,
  Upload,
  Image as ImageIcon,
  School
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLearning } from "../context/LearningContext";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";
import { SUPPORTED_LANGUAGES, DEPARTMENTS } from "../data/translations";

export const Settings = () => {
  const { user, updateProfile, logout } = useAuth();
  const { activeLanguage, setActiveLanguage } = useLearning();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [formData, setFormData] = useState({
    name: user?.name || "Student",
    email: user?.email || "student@university.edu",
    role: user?.role || user?.department || DEPARTMENTS[0],
    department: user?.department || user?.role || DEPARTMENTS[0],
    preferredDifficulty: user?.preferredDifficulty || "Intermediate",
    speechRate: user?.speechRate || 1.0,
    notifications: user?.notifications !== undefined ? user.notifications : true
  });

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

  const handleUseGoogleAvatar = () => {
    const googleAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=google_${user?.name || "Student"}`;
    setAvatarPreview(googleAvatar);
    updateProfile({ avatar: googleAvatar });
    showSuccess("Google Account avatar applied!");
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateProfile({
      ...formData,
      avatar: avatarPreview
    });
    showSuccess("Settings & preferences successfully saved!");
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
          Upload custom profile pictures, update your department, and set app-wide multilingual learning preferences.
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
                  icon={ImageIcon}
                  onClick={handleUseGoogleAvatar}
                >
                  Use Google Avatar
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

        {/* AI & Multilingual Learning Preferences */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Globe className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900">App-Wide Multilingual Learning Preferences</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Preferred Language */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Default Learning Language (App-Wide)
              </label>
              <select
                value={activeLanguage}
                onChange={(e) => {
                  setActiveLanguage(e.target.value);
                  updateProfile({ preferredLanguage: e.target.value });
                  showSuccess(`App language set to ${SUPPORTED_LANGUAGES.find(l => l.code === e.target.value)?.name}!`);
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name} ({lang.native})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Summaries, voice synthesis, and quizzes will default to this language.
              </p>
            </div>

            {/* Baseline Difficulty */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                AI Baseline Difficulty
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

        {/* Notifications & System Settings */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Volume2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Notifications & Audio</h3>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-500" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                  Adaptive Learning Diagnostic Alerts
                </h4>
                <p className="text-xs text-slate-500">
                  Receive notifications when weak topics are detected in quiz attempts
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <Button
            type="button"
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
