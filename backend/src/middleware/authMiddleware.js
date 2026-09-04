import { authGuard, generateToken } from "./auth.js";

export const authMiddleware = authGuard;
export { authGuard, generateToken };
export default authMiddleware;
