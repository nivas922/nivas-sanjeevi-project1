import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";

export const Login = () => {
  const [email, setEmail] = useState("alex.johnson@university.edu");
  const [password, setPassword] = useState("student123");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showError("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      showSuccess("Welcome back to LearnAI!");
      navigate("/");
    } catch (err) {
      showError("Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await login("alex.johnson@university.edu", "student123");
      showSuccess("Logged in as Demo Student (Alex Johnson)!");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-brand text-white shadow-soft-md mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Welcome back to Learn<span className="text-brand-600">AI</span>
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w">
          AI-Powered Multilingual Textbook Summarization & Adaptive Learning System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200/80 shadow-soft-lg space-y-6">
          {/* Quick Demo Student Sign In Button */}
          <div className="p-3.5 rounded-2xl bg-brand-50/70 border border-brand-100 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-bold text-brand-900 block">Evaluator / Demo Mode</span>
              <span className="text-brand-700">Pre-seeded with 4 subjects & quizzes</span>
            </div>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-soft-sm shrink-0"
            >
              1-Click Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              icon={ArrowRight}
              iconPosition="right"
              className="w-full py-3 mt-2 shadow-soft-md"
            >
              Sign In to Dashboard
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-bold text-brand-600 hover:text-brand-700 ml-1"
              >
                Register Here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
