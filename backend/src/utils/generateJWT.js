import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const generateJWT = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email_or_mobile: user.email_or_mobile,
      role: user.role,
      login_method: user.login_method,
      preferred_language: user.preferred_language
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

export const verifyJWT = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};
