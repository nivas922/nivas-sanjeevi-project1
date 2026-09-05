import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  Phone,
  X,
  Loader2,
  KeyRound,
  AlertCircle,
  Clock
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";
import { GoogleLoginButton } from "../components/Auth/GoogleLoginButton";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Mobile OTP Modal State
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [mobileStep, setMobileStep] = useState(1); // 1 = Phone, 2 = OTP
  const [mobileOtp, setMobileOtp] = useState(["", "", "", "", "", ""]);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileCooldown, setMobileCooldown] = useState(0);
  const [mobileExpiry, setMobileExpiry] = useState(0);

  // Email Verification Modal State (Triggered if email is unverified)
  const [showEmailVerifyModal, setShowEmailVerifyModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailExpiry, setEmailExpiry] = useState(0);

  // Forgot Password Modal State
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState(1); // 1 = Email, 2 = OTP & New Password
  const [forgotOtp, setForgotOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const {
    login,
    loginWithGoogle,
    sendMobileOtp,
    loginWithMobile,
    verifyEmailOtp,
    resendEmailOtp,
    forgotPassword,
    resetPassword
  } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const navigate = useNavigate();

  // Cooldown timers
  useEffect(() => {
    let timer;
    if (mobileCooldown > 0) {
      timer = setInterval(() => setMobileCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [mobileCooldown]);

  useEffect(() => {
    let timer;
    if (mobileExpiry > 0) {
      timer = setInterval(() => setMobileExpiry((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [mobileExpiry]);

  useEffect(() => {
    let timer;
    if (emailCooldown > 0) {
      timer = setInterval(() => setEmailCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [emailCooldown]);

  useEffect(() => {
    let timer;
    if (emailExpiry > 0) {
      timer = setInterval(() => setEmailExpiry((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [emailExpiry]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 1. Google OAuth Sign-In (Real verification with backend)
  const handleGoogleSuccess = async (idToken) => {
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
      showSuccess("Google verification successful! Welcome.");
      navigate("/");
    } catch (err) {
      showError(err.message || "Google verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Mobile OTP Flow
  const handleOpenMobileModal = () => {
    setMobileStep(1);
    setMobileOtp(["", "", "", "", "", ""]);
    setShowMobileModal(true);
  };

  const handleSendMobileOtp = async () => {
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    if (cleanNumber.length < 10) {
      showError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setMobileLoading(true);
    try {
      await sendMobileOtp(cleanNumber);
      setMobileStep(2);
      setMobileCooldown(30);
      setMobileExpiry(300); // 5 minutes
      showSuccess(`Verification code dispatched to +91 ${cleanNumber}. Valid for 5 minutes.`);
    } catch (err) {
      showError(err.message || "Failed to dispatch mobile verification code.");
    } finally {
      setMobileLoading(false);
    }
  };

  const handleMobileOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newArr = [...mobileOtp];
    newArr[index] = value;
    setMobileOtp(newArr);

    if (value && index < 5) {
      const next = document.getElementById(`mobile-otp-${index + 1}`);
      if (next) next.focus();
    }
  };

  const handleVerifyMobileOtp = async () => {
    const code = mobileOtp.join("");
    if (code.length < 6) {
      showError("Please enter the complete 6-digit code.");
      return;
    }

    setMobileLoading(true);
    try {
      await loginWithMobile(phoneNumber, code);
      showSuccess("Mobile verification successful! Welcome.");
      setShowMobileModal(false);
      navigate("/");
    } catch (err) {
      showError(err.message || "Invalid or expired verification code.");
    } finally {
      setMobileLoading(false);
    }
  };

  // 3. Email & Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      showSuccess("Signed in successfully! Welcome to LearnAI.");
      navigate("/");
    } catch (err) {
      if (err.emailNotVerified) {
        setUnverifiedEmail(err.email || email);
        setEmailOtp(["", "", "", "", "", ""]);
        setEmailExpiry(300);
        setEmailCooldown(30);
        setShowEmailVerifyModal(true);
        showInfo("Your email is not verified yet. We sent a verification code to your inbox.");
      } else {
        showError(err.message || "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 4. Verify Email OTP Flow
  const handleEmailOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newArr = [...emailOtp];
    newArr[index] = value;
    setEmailOtp(newArr);

    if (value && index < 5) {
      const next = document.getElementById(`email-otp-${index + 1}`);
      if (next) next.focus();
    }
  };

  const handleVerifyEmail = async () => {
    const code = emailOtp.join("");
    if (code.length < 6) {
      showError("Please enter the complete 6-digit verification code.");
      return;
    }

    setEmailVerifyLoading(true);
    try {
      await verifyEmailOtp(unverifiedEmail, code);
      showSuccess("Email verified and signed in! Welcome.");
      setShowEmailVerifyModal(false);
      navigate("/");
    } catch (err) {
      showError(err.message || "Email verification failed.");
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    if (emailCooldown > 0) return;
    try {
      await resendEmailOtp(unverifiedEmail);
      setEmailCooldown(30);
      setEmailExpiry(300);
      showSuccess("A fresh verification code has been dispatched to your email.");
    } catch (err) {
      showError(err.message || "Failed to resend verification code.");
    }
  };

  // 5. Forgot Password Flow
  const handleSendForgotPasswordOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      showError("Please enter your registered email address.");
      return;
    }

    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail);
      setForgotStep(2);
      showSuccess("Password reset code sent to your email.");
    } catch (err) {
      showError(err.message || "Failed to send reset code.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const code = forgotOtp.join("");
    if (code.length < 6) {
      showError("Please enter the full 6-digit reset code.");
      return;
    }
    if (newPassword.length < 6) {
      showError("New password must be at least 6 characters long.");
      return;
    }

    setForgotLoading(true);
    try {
      await resetPassword({
        email: forgotEmail,
        otp: code,
        newPassword
      });
      showSuccess("Password reset successfully! You can now log in.");
      setShowForgotPasswordModal(false);
      setPassword(newPassword);
    } catch (err) {
      showError(err.message || "Password reset failed.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-brand text-white shadow-soft-md mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Sign In to Learn<span className="text-brand-600">AI</span>
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          AI-Powered Multilingual Textbook Summarization & Adaptive Learning System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200/80 shadow-soft-lg space-y-6">
          {/* Third-Party Authentication Options */}
          <div className="space-y-3">
            {/* Real Google OAuth Button */}
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={(err) => showError(err.message || "Google sign-in error")}
              loading={loading}
            />

            {/* Real Mobile OTP Login */}
            <button
              type="button"
              onClick={handleOpenMobileModal}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-soft-sm hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
            >
              <Phone className="w-4 h-4 text-brand-600" />
              <span>Continue with Mobile Number</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Or with Email
            </span>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
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
                  placeholder="Enter your student email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotStep(1);
                    setShowForgotPasswordModal(true);
                  }}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={loading || !email || password.length < 6}
              icon={ArrowRight}
              iconPosition="right"
              className="w-full py-3 shadow-soft-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign In
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-bold text-brand-600 hover:text-brand-700 ml-1"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* 1. REAL MOBILE OTP MODAL */}
      {showMobileModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-soft-lg border border-slate-100">
            <button
              onClick={() => setShowMobileModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
              <Phone className="w-6 h-6" />
            </div>

            {mobileStep === 1 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Sign in with Mobile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    We will send a real 6-digit one-time verification code to your phone.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <span className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendMobileOtp}
                  disabled={mobileLoading || phoneNumber.length < 10}
                  className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-soft-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {mobileLoading ? "Sending Code..." : "Send Verification OTP"}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Enter 6-Digit OTP</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sent to +91 {phoneNumber}</p>
                </div>

                {/* Expiry Banner */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-brand-600" />
                    Code expires in:
                  </span>
                  <span className="font-mono font-bold text-brand-600">
                    {mobileExpiry > 0 ? formatTimer(mobileExpiry) : "Expired"}
                  </span>
                </div>

                {/* 6 Digits Box */}
                <div className="flex justify-between gap-2">
                  {mobileOtp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`mobile-otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleMobileOtpChange(idx, e.target.value)}
                      className="w-11 h-12 text-center text-lg font-extrabold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleVerifyMobileOtp}
                  loading={mobileLoading}
                  disabled={mobileLoading || mobileOtp.join("").length < 6 || mobileExpiry <= 0}
                  className="w-full"
                >
                  Verify & Sign In
                </Button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setMobileStep(1)}
                    className="font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Change Number
                  </button>
                  <button
                    type="button"
                    onClick={handleSendMobileOtp}
                    disabled={mobileCooldown > 0}
                    className="font-bold text-brand-600 hover:text-brand-700 cursor-pointer disabled:text-slate-400"
                  >
                    {mobileCooldown > 0 ? `Resend Code (${mobileCooldown}s)` : "Resend Code"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. REAL EMAIL VERIFICATION MODAL */}
      {showEmailVerifyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-soft-lg border border-slate-100 space-y-5">
            <button
              onClick={() => setShowEmailVerifyModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Email Verification Required</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter the 6-digit security code sent to <strong className="text-slate-800">{unverifiedEmail}</strong>
              </p>
            </div>

            {/* Timer Banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Code expires in:
              </span>
              <span className="font-mono font-bold text-amber-600">
                {emailExpiry > 0 ? formatTimer(emailExpiry) : "Expired"}
              </span>
            </div>

            {/* 6 Digits Box */}
            <div className="flex justify-between gap-2">
              {emailOtp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`email-otp-${idx}`}
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
              onClick={handleVerifyEmail}
              loading={emailVerifyLoading}
              disabled={emailVerifyLoading || emailOtp.join("").length < 6 || emailExpiry <= 0}
              className="w-full"
            >
              Verify Code & Sign In
            </Button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setShowEmailVerifyModal(false)}
                className="font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResendEmailOtp}
                disabled={emailCooldown > 0}
                className="font-bold text-brand-600 hover:text-brand-700 cursor-pointer disabled:text-slate-400"
              >
                {emailCooldown > 0 ? `Resend Code (${emailCooldown}s)` : "Resend Code"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. FORGOT PASSWORD MODAL */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-soft-lg border border-slate-100 space-y-5">
            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleSendForgotPasswordOtp} className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Reset Your Password</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter your registered email address and we'll send you an OTP to reset your password.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={forgotLoading}
                  disabled={forgotLoading || !forgotEmail}
                  className="w-full"
                >
                  Send Reset Code
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Enter Reset Code & New Password</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sent to {forgotEmail}</p>
                </div>

                <div className="flex justify-between gap-2">
                  {forgotOtp.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const newArr = [...forgotOtp];
                        newArr[idx] = e.target.value.slice(-1);
                        setForgotOtp(newArr);
                      }}
                      className="w-11 h-12 text-center text-lg font-extrabold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  ))}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={forgotLoading}
                  disabled={forgotLoading || forgotOtp.join("").length < 6 || newPassword.length < 6}
                  className="w-full"
                >
                  Update Password & Sign In
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
