import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  User,
  Mail,
  Lock,
  ArrowRight,
  School,
  X,
  Clock
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";
import { DEPARTMENTS } from "../data/translations";
import { GoogleLoginButton } from "../components/Auth/GoogleLoginButton";

export const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [loading, setLoading] = useState(false);

  // Email OTP Verification Modal State
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState(["", "", "", "", "", ""]);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiry, setExpiry] = useState(0);

  const { register, verifyEmailOtp, resendEmailOtp, loginWithGoogle } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Cooldown and expiry timers
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    let timer;
    if (expiry > 0) {
      timer = setInterval(() => setExpiry((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [expiry]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 1. Real Google Sign-Up Handler
  const handleGoogleSuccess = async (idToken) => {
    setLoading(true);
    try {
      await loginWithGoogle(idToken, department);
      showSuccess("Account registered & authenticated with Google!");
      navigate("/");
    } catch (err) {
      showError(err.message || "Google registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Email Registration -> Dispatches Verification OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showError("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        department
      });
      setEmailOtpCode(["", "", "", "", "", ""]);
      setExpiry(300); // 5 minutes
      setCooldown(30);
      setShowEmailOtpModal(true);
      showSuccess(`Verification code dispatched to ${email}. Valid for 5 minutes.`);
    } catch (err) {
      showError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newArr = [...emailOtpCode];
    newArr[index] = value;
    setEmailOtpCode(newArr);

    if (value && index < 5) {
      const next = document.getElementById(`reg-email-otp-${index + 1}`);
      if (next) next.focus();
    }
  };

  const handleVerifyEmailOtp = async () => {
    const fullOtp = emailOtpCode.join("");
    if (fullOtp.length < 6) {
      showError("Please enter the complete 6-digit verification code.");
      return;
    }

    setEmailOtpLoading(true);
    try {
      await verifyEmailOtp(email, fullOtp);
      showSuccess("Account verified & created! Welcome to LearnAI.");
      setShowEmailOtpModal(false);
      navigate("/");
    } catch (err) {
      showError(err.message || "Email verification failed.");
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    try {
      await resendEmailOtp(email);
      setCooldown(30);
      setExpiry(300);
      showSuccess("A fresh verification code has been dispatched to your email.");
    } catch (err) {
      showError(err.message || "Failed to resend code.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-brand text-white shadow-soft-md mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Create Student Account
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          Get your zero-state personalized textbook tutor and adaptive quiz generator.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200/80 shadow-soft-lg space-y-6">
          {/* Google Sign-Up */}
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={(err) => showError(err.message || "Google sign-up error")}
            loading={loading}
            text="Sign up with Google"
          />

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Or with Email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alan Turing"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                Department / Field of Study
              </label>
              <div className="relative">
                <School className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={loading || !name || !email || password.length < 6 || password !== confirmPassword}
              icon={ArrowRight}
              iconPosition="right"
              className="w-full py-3 mt-2 shadow-soft-md disabled:opacity-50"
            >
              Verify Email & Create Account
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-bold text-brand-600 hover:text-brand-700 ml-1"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* REAL EMAIL OTP VERIFICATION MODAL */}
      {showEmailOtpModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-soft-lg border border-slate-100 space-y-5">
            <button
              onClick={() => setShowEmailOtpModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Verify Email Address</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                We sent a 6-digit verification code to <strong className="text-slate-800">{email}</strong>
              </p>
            </div>

            {/* Timer Banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                Code expires in:
              </span>
              <span className="font-mono font-bold text-brand-600">
                {expiry > 0 ? formatTimer(expiry) : "Expired"}
              </span>
            </div>

            {/* 6 Digits Box */}
            <div className="flex justify-between gap-2">
              {emailOtpCode.map((digit, idx) => (
                <input
                  key={idx}
                  id={`reg-email-otp-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleEmailOtpChange(idx, e.target.value)}
                  className="w-11 h-12 text-center text-lg font-extrabold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              ))}
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleVerifyEmailOtp}
              loading={emailOtpLoading}
              disabled={emailOtpLoading || emailOtpCode.join("").length < 6 || expiry <= 0}
              className="w-full"
            >
              Verify & Complete Registration
            </Button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setShowEmailOtpModal(false)}
                className="font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Change Email
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0}
                className="font-bold text-brand-600 hover:text-brand-700 cursor-pointer disabled:text-slate-400"
              >
                {cooldown > 0 ? `Resend Code (${cooldown}s)` : "Resend Code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
