import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const app = initializeApp({
  apiKey: import.meta.env.VITE_FB_API_KEY || "missing",
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || "missing.firebaseapp.com",
  projectId: import.meta.env.VITE_FB_PROJECT_ID || "missing",
  appId: import.meta.env.VITE_FB_APP_ID || "missing",
});
export const auth = getAuth(app);
export const db = getFirestore(app);
