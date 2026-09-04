import { env } from "./env.js";

export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.FIREBASE_PROJECT_ID || "learnai-platform",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.FIREBASE_APP_ID || ""
};

export const verifyGoogleToken = async (idToken) => {
  // If external Firebase token verification is required
  if (!idToken) throw new Error("ID Token is required");
  return { valid: true };
};
