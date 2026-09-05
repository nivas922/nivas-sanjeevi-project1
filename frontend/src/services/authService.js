import { api } from "./api";
import { storageService } from "./storageService";

export const authService = {
  loginWithGoogle: (idToken, department) => api.loginWithGoogle(idToken, department),
  sendMobileOtp: (mobile) => api.sendMobileOtp(mobile),
  loginWithMobile: (mobile, otp, department) => api.loginWithMobile(mobile, otp, department),
  signupWithEmail: (data) => api.register(data),
  verifyEmailOtp: (email, otp) => api.verifyEmailOtp(email, otp),
  loginWithEmail: (credentials) => api.login(credentials),
  resendEmailOtp: (email) => api.resendEmailOtp(email),
  forgotPassword: (email) => api.forgotPassword(email),
  resetPassword: (data) => api.resetPassword(data),
  getProfile: () => api.getProfile(),
  logout: () => storageService.clearSession()
};

export default authService;
