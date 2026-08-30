import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  UploadCloud,
  FileText,
  Volume2,
  HelpCircle,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  X,
  GraduationCap
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLearning } from "../../context/LearningContext";

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { recommendations } = useLearning();
  const navigate = useNavigate();

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "My Textbooks", path: "/textbooks", icon: BookOpen },
    { label: "Upload Textbook", path: "/upload", icon: UploadCloud, highlight: true },
    { label: "My Summaries", path: "/summaries", icon: FileText },
    { label: "Text to Speech", path: "/tts", icon: Volume2 },
    { label: "AI Quiz", path: "/quiz", icon: HelpCircle },
    { label: "Progress", path: "/progress", icon: BarChart3 },
    {
      label: "AI Recommendations",
      path: "/recommendations",
      icon: Sparkles,
      badge: recommendations?.length > 0 ? recommendations.length : null
    },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Header & Logo */}
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
            <NavLink to="/" className="flex items-center gap-3 group" onClick={onClose}>
              <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shadow-soft-sm group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-slate-900 font-sans">
                  Learn<span className="text-brand-600">AI</span>
                </span>
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest -mt-1">
                  Adaptive Edu
                </span>
              </div>
            </NavLink>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-160px)]">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Platform Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? "bg-brand-50 text-brand-700 shadow-soft-sm font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    } ${item.highlight && !location.pathname.includes(item.path) ? "text-brand-600 bg-brand-50/50" : ""}`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-brand-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Student Profile */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-slate-200/60 shadow-soft-sm">
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
              alt={user?.name || "Student"}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-100"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "Student"}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.department || user?.role || "Student"}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
