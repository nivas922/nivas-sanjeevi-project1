import { api } from "./api";
import { storageService } from "./storageService";

export const authService = {
  loginWithGoogle: (data) => api.loginWithGoogle(data),
  sendMobileOtp: (mobile) => api.sendMobileOtp(mobile),
  loginWithMobile: (mobile, otp) => api.loginWithMobile(mobile, otp),
  getProfile: () => api.getProfile(),
  logout: () => storageService.clearSession()
};

export default authService;
