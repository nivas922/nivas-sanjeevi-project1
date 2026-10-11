import { User } from "../models/User.js";
import { StorageService } from "../services/storageService.js";
import { DEFAULT_USER_ID, resolveAuthUserId } from "../middleware/auth.js";

export class ProfileController {
  // GET /profile - Get public student profile
  static async getProfile(req, res, next) {
    try {
      const authUserId = resolveAuthUserId(req);
      const userId = authUserId || DEFAULT_USER_ID;
      let user = await User.findById(userId);
      if (!user) {
        user = await User.getDefaultUser();
      }
      return res.status(200).json({
        success: true,
        status: "success",
        user
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /profile - Update public student preferences
  static async updateProfile(req, res, next) {
    try {
      const authUserId = resolveAuthUserId(req);
      const targetUserId = authUserId || DEFAULT_USER_ID;

      // Prevent unauthenticated requests from targeting or modifying private user accounts
      if (!authUserId && req.body.id && req.body.id !== DEFAULT_USER_ID) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: Cannot modify other user accounts."
        });
      }

      // Whitelist ONLY non-sensitive preference fields
      const updatePayload = {};

      if (req.body.name && typeof req.body.name === "string") {
        updatePayload.name = req.body.name.trim().slice(0, 100);
      }

      if (req.file) {
        updatePayload.profile_pic_url = StorageService.getFileUrl(req.file.filename);
      } else if (req.body.avatar && typeof req.body.avatar === "string") {
        updatePayload.profile_pic_url = req.body.avatar.trim();
      }

      const lang = req.body.preferred_language || req.body.preferredLanguage;
      if (lang && typeof lang === "string") {
        updatePayload.preferred_language = lang.trim();
      }

      const role = req.body.role || req.body.department;
      if (role && typeof role === "string") {
        updatePayload.role = role.trim();
      }

      const updatedUser = await User.update(targetUserId, updatePayload);

      return res.status(200).json({
        success: true,
        status: "success",
        message: "Profile updated successfully.",
        user: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }
}

