import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyD5czTSvV7meNiWDwCXCRnWUbrd89OFSn4",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "ai-hackathon-b5bfb.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "ai-hackathon-b5bfb",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "ai-hackathon-b5bfb.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "485359047386",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:485359047386:web:a23bf167a6a717c02d4be3",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-53214BTD3K"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
