import { User } from "../models/User.js";
import { StorageService } from "../services/storageService.js";

export class ProfileController {
  // PUT /profile
  static async updateProfile(req, res, next) {
    try {
      const userId = req.userId;
      const updatePayload = { ...req.body };

      // If user uploaded a new avatar file
      if (req.file) {
        updatePayload.profile_pic_url = StorageService.getFileUrl(req.file.filename);
      } else if (req.body.avatar) {
        updatePayload.profile_pic_url = req.body.avatar;
      }

      // Handle aliases
      if (req.body.preferredLanguage && !updatePayload.preferred_language) {
        updatePayload.preferred_language = req.body.preferredLanguage;
      }
      if (req.body.department && !updatePayload.role) {
        updatePayload.role = req.body.department;
      }

      const updatedUser = await User.update(userId, updatePayload);

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
