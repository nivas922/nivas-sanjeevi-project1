import React, { useState } from "react";
import { Menu, Search, Globe, Bell, Sparkles, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLearning } from "../../context/LearningContext";
import { Button } from "../common/Button";
import { SUPPORTED_LANGUAGES } from "../../data/translations";

export const Navbar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { activeLanguage, setActiveLanguage } = useLearning();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const navigate = useNavigate();

  const activeLangObj = SUPPORTED_LANGUAGES.find(l => l.code === activeLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left side: Mobile Hamburger & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search textbooks, topics, summaries, quizzes..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm font-medium border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right side: Quick Upload, Language Switcher, Notifications, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          size="sm"
          variant="primary"
          icon={UploadCloud}
          onClick={() => navigate("/upload")}
          className="hidden sm:inline-flex"
        >
          Upload
        </Button>

        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-soft-sm"
          >
            <Globe className="w-3.5 h-3.5 text-brand-600" />
            <span className="hidden md:inline">{activeLangObj.name}</span>
            <span>{activeLangObj.flag}</span>
          </button>

          {showLangDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-soft-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Target Language
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setActiveLanguage(lang.code);
                      setShowLangDropdown(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-brand-50 transition-colors ${
                      activeLanguage === lang.code ? "text-brand-600 bg-brand-50/60 font-bold" : "text-slate-700"
                    }`}
                  >
                    <span>{lang.name} ({lang.native})</span>
                    <span>{lang.flag}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-soft-lg border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">AI Notifications</h4>
                  <span className="text-[10px] bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded-full">Active</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-purple-900">Adaptive Engine Ready</p>
                      <p className="text-[11px] text-purple-700 mt-0.5">Upload a textbook or take a quiz to begin personalized tracking.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Avatar */}
        <div
          onClick={() => navigate("/settings")}
          className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-slate-100 transition-colors"
          title="Account Settings"
        >
          <img
            src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
            alt={user?.name || "Student"}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
          />
        </div>
      </div>
    </header>
  );
};
