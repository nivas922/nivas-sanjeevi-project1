import { api } from "./api";

export const profileService = {
  getProfile: () => api.getProfile(),
  updateProfile: (profileData) => api.updateProfile(profileData)
};

export default profileService;
