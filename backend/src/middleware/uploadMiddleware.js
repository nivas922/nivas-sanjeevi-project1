import { uploadBookMiddleware, uploadAvatarMiddleware } from "./upload.js";

export const uploadMiddleware = {
  uploadBook: uploadBookMiddleware,
  uploadAvatar: uploadAvatarMiddleware
};

export { uploadBookMiddleware, uploadAvatarMiddleware };
export default uploadMiddleware;
