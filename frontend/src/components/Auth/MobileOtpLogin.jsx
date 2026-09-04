import React, { useState } from "react";
import { Phone, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export const MobileOtpLogin = ({ onSendOtp, onVerifyOtp, loading }) => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;
    await onSendOtp(phone);
    setStep(2);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) return;
    await onVerifyOtp(phone, otp);
  };

  return (
    <div className="space-y-4">
      {step === 1 ? (
        <form onSubmit={handleSend} className="space-y-3">
          <div className="relative">
            <Phone className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter 10-digit mobile number"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Send Verification OTP</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <div className="relative">
            <ShieldCheck className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP code"
              maxLength={6}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Sign In"}
          </button>
        </form>
      )}
    </div>
  );
};
export default MobileOtpLogin;
