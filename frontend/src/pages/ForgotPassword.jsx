import React, { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Mail, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      showError("Please enter your registered email address.");
      return;
    }
    setSent(true);
    showSuccess("Password reset instructions sent to your email!");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-brand text-white shadow-soft-md mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Reset Password
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          Enter your student email and we'll send you recovery instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200/80 shadow-soft-lg space-y-6">
          {!sent ? (
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

              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={Send}
                iconPosition="right"
                className="w-full py-3 shadow-soft-md"
              >
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
              <h4 className="text-base font-bold text-slate-900">Check your inbox</h4>
              <p className="text-xs text-slate-500">
                We've sent password reset instructions to <strong>{email}</strong>.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
