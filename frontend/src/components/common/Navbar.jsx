import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, LogOut, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black">
            L
          </div>
          <span className="text-lg font-black text-slate-900 tracking-tight">Learn<span className="text-brand-600">AI</span></span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <Link to="/settings" className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
              <img src={user.avatar || user.profile_pic_url || "https://api.dicebear.com/7.x/bottts/svg?seed=user"} alt="Avatar" className="w-7 h-7 rounded-full object-cover ring-2 ring-brand-200" />
              <span className="text-xs font-bold text-slate-700 hidden sm:inline">{user.name}</span>
            </Link>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link to="/login" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-colors">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
};
export default Navbar;
