import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  User,
  Mail,
  Lock,
  ArrowRight,
  School,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";
import { DEPARTMENTS } from "../data/translations";

export const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [loading, setLoading] = useState(false);

  // Google Account Chooser Modal State (Matching Image 3)
  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  // Email OTP Verification Modal State
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState(["", "", "", "", "", ""]);
  const [generatedEmailOtp, setGeneratedEmailOtp] = useState("849201");
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);

  const { register, loginWithGoogle } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // 1. Google Sign-Up Handler
  const handleOpenGooglePicker = () => {
    setShowGooglePicker(true);
  };

  const handleSelectGoogleAccount = async (account) => {
    setShowGooglePicker(false);
    setLoading(true);
    try {
      await loginWithGoogle({
        name: account.name,
        email: account.email,
        department: department || DEPARTMENTS[0],
        avatar: account.avatar
      });
      showSuccess(`Account registered with Google as ${account.name}!`);
      navigate("/");
    } catch (err) {
      showError("Google sign-up failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleSubmit = (e) => {
    e.preventDefault();
    if (!customGoogleEmail || !customGoogleEmail.includes("@")) {
      showError("Please enter a valid Google email address.");
      return;
    }
    const derivedName = customGoogleEmail.split("@")[0];
    handleSelectGoogleAccount({
      name: derivedName.toUpperCase(),
      email: customGoogleEmail,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(derivedName)}`
    });
  };

  // 2. Email Registration -> Triggers Email OTP
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

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedEmailOtp(newOtp);
    setEmailOtpCode(["", "", "", "", "", ""]);
    setShowEmailOtpModal(true);
    showSuccess(`Verification code sent to ${email}`);
  };

  const handleAutoFillEmailOtp = () => {
    const digits = generatedEmailOtp.split("");
    setEmailOtpCode(digits);
    showSuccess("OTP auto-filled!");
  };

  const handleEmailOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newArr = [...emailOtpCode];
    newArr[index] = value;
    setEmailOtpCode(newArr);

    if (value && index < 5) {
      const nextInput = document.getElementById(`reg-email-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerifyEmailOtp = async () => {
    const fullOtp = emailOtpCode.join("");
    if (fullOtp.length < 6) {
      showError("Please enter the full 6-digit verification code.");
      return;
    }

    setEmailOtpLoading(true);
    try {
      await register(name, email, password, department);
      showSuccess("Account registered & verified! Welcome to LearnAI.");
      setShowEmailOtpModal(false);
      navigate("/");
    } catch (err) {
      showError("Registration failed.");
    } finally {
      setEmailOtpLoading(false);
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
          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleOpenGooglePicker}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-soft-sm hover:border-slate-300 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign up with Google</span>
          </button>

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
                  placeholder="e.g. NIVAS M"
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
              icon={ArrowRight}
              iconPosition="right"
              className="w-full py-3 mt-2 shadow-soft-md"
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

      {/* 1. GOOGLE ACCOUNT CHOOSER MODAL (Matching Image 3) */}
      {showGooglePicker && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#18181b] text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 space-y-6">
            <button
              onClick={() => setShowGooglePicker(false)}
              className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Google Header */}
            <div className="flex items-center gap-2 text-sm text-zinc-300 font-medium pb-2 border-b border-white/10">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Choose an account</h2>
              <p className="text-xs text-zinc-400 mt-1">
                to continue to <strong className="text-brand-400">learnai.edu</strong>
              </p>
            </div>

            {/* Accounts List (Matching User's Image 3) */}
            <div className="divide-y divide-white/10 border-y border-white/10">
              {/* Account 1: NIVAS M */}
              <button
                type="button"
                onClick={() =>
                  handleSelectGoogleAccount({
                    name: "NIVAS M",
                    email: "nivasm.it24@bitsathy.ac.in",
                    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=NIVAS_M"
                  })
                }
                className="w-full py-4 px-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left rounded-xl cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-sm shadow-md">
                    N
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                      NIVAS M
                    </h4>
                    <p className="text-xs text-zinc-400">nivasm.it24@bitsathy.ac.in</p>
                  </div>
                </div>
              </button>

              {/* Account 2: nivasm123 */}
              <button
                type="button"
                onClick={() =>
                  handleSelectGoogleAccount({
                    name: "nivasm123",
                    email: "nivasm2508@gmail.com",
                    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=nivasm123"
                  })
                }
                className="w-full py-4 px-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left rounded-xl cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                    n
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                      nivasm123
                    </h4>
                    <p className="text-xs text-zinc-400">nivasm2508@gmail.com</p>
                  </div>
                </div>
              </button>

              {/* Account 3: Use another account */}
              <button
                type="button"
                onClick={() => setShowCustomGoogleInput(!showCustomGoogleInput)}
                className="w-full py-4 px-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left rounded-xl cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 font-bold flex items-center justify-center text-sm border border-zinc-700">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors">
                      Use another account
                    </h4>
                  </div>
                </div>
              </button>
            </div>

            {/* Custom Google Email Input */}
            {showCustomGoogleInput && (
              <form onSubmit={handleCustomGoogleSubmit} className="p-3 bg-zinc-900 rounded-2xl border border-white/10 space-y-2 animate-in fade-in">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">Enter your Gmail Address:</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="student@gmail.com"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl"
                  >
                    Continue
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 2. EMAIL OTP VERIFICATION MODAL */}
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
              <p className="text-xs text-slate-500 mt-0.5">We sent a 6-digit security code to <strong className="text-slate-800">{email}</strong></p>
            </div>

            {/* Email Simulation Banner */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-blue-800">
                  <span>📬</span>
                  <span>Simulated Inbox Delivery</span>
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-200/80 rounded-md text-blue-900">
                  Delivered
                </span>
              </div>
              <p className="text-blue-900 font-medium">
                Your Email Verification Code is: <strong className="text-sm font-black tracking-widest text-blue-950 bg-white px-2 py-0.5 rounded border border-blue-300 ml-1">{generatedEmailOtp}</strong>
              </p>
              <button
                type="button"
                onClick={handleAutoFillEmailOtp}
                className="w-full py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-soft-sm"
              >
                <span>⚡ One-Click Auto-Fill Code</span>
              </button>
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
              className="w-full"
            >
              Verify & Complete Registration
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
