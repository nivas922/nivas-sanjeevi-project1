import { api } from "./api";
import { storageService } from "./storageService";

export const authService = {
  getProfile: () => api.getProfile(),
  logout: () => storageService.clearSession()
};

export default authService;
