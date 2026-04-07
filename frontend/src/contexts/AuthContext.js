import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';
import { createOrGetUserProfile } from '../services/userProfileService';
import { saveUserProfile } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);

  // BUG FIX: Stable consent key helper — does not depend on user state ref
  const getConsentKey = (uid) => uid ? `avana_consent_${uid}` : null;

  const setConsent = useCallback((value) => {
    // Access current user uid from auth directly to avoid stale closure
    const uid = auth.currentUser?.uid;
    const key = getConsentKey(uid);
    if (key) {
      localStorage.setItem(key, value ? 'true' : 'false');
    }
    setConsentGiven(value);
  }, []);

  const clearConsent = useCallback(() => {
    const uid = auth.currentUser?.uid;
    const key = getConsentKey(uid);
    if (key) localStorage.removeItem(key);
    setConsentGiven(false);
  }, []);

  const hasConsent = useCallback(() => {
    const uid = auth.currentUser?.uid;
    const key = getConsentKey(uid);
    return key ? localStorage.getItem(key) === 'true' : false;
  }, []);

  // ── Auth state listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        try {
          const userProfile = await createOrGetUserProfile(firebaseUser);

          const userData = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: userProfile?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            age: userProfile?.age,
            phone: userProfile?.phone,
            guardian_phone: userProfile?.guardian_phone,
            photoURL: firebaseUser.photoURL
          };

          setUser(userData);
          setProfile(userProfile);

          // Restore consent from storage
          const consentKey = getConsentKey(firebaseUser.uid);
          setConsentGiven(consentKey ? localStorage.getItem(consentKey) === 'true' : false);
        } catch (err) {
          console.error('Error loading user profile:', err);
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            photoURL: firebaseUser.photoURL
          });
          setProfile(null);
          setConsentGiven(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setConsentGiven(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Login with email ─────────────────────────────────────────────────────────
  const loginWithEmail = useCallback(async (email, password) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userProfile = await createOrGetUserProfile(result.user);

      const userData = {
        id: result.user.uid,
        email: result.user.email,
        name: userProfile?.name || result.user.displayName || result.user.email?.split('@')[0] || 'User',
        age: userProfile?.age,
        phone: userProfile?.phone,
        guardian_phone: userProfile?.guardian_phone,
        photoURL: result.user.photoURL
      };

      setUser(userData);
      setProfile(userProfile);

      const consentKey = getConsentKey(result.user.uid);
      setConsentGiven(consentKey ? localStorage.getItem(consentKey) === 'true' : false);

      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // ── Login with Google ────────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userProfile = await createOrGetUserProfile(result.user);

      const userData = {
        id: result.user.uid,
        email: result.user.email,
        name: userProfile?.name || result.user.displayName || result.user.email?.split('@')[0] || 'User',
        age: userProfile?.age,
        phone: userProfile?.phone,
        guardian_phone: userProfile?.guardian_phone,
        photoURL: result.user.photoURL
      };

      setUser(userData);
      setProfile(userProfile);

      const consentKey = getConsentKey(result.user.uid);
      setConsentGiven(consentKey ? localStorage.getItem(consentKey) === 'true' : false);

      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // ── Signup with email ────────────────────────────────────────────────────────
  // BUG FIX: Now passes additionalData to createOrGetUserProfile so age/guardian_phone is saved
  const signupWithEmail = useCallback(async (email, password, additionalData = {}) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Update Firebase display name immediately
      const displayName = additionalData.name || email.split('@')[0];
      await updateProfile(result.user, { displayName });

      // BUG FIX: Pass extraData so the profile is created with correct age/guardian data
      const userProfile = await createOrGetUserProfile(result.user, {
        name: displayName,
        age: additionalData.age ?? 18,
        phone: additionalData.phone || '',
        guardian_phone: additionalData.guardian_phone || null,
      });

      // If createOrGetUserProfile returned an existing profile (e.g., race condition),
      // force save the signup data through saveUserProfile directly
      if (!userProfile?.age || userProfile.age === 18) {
        await saveUserProfile({
          id: result.user.uid,
          name: displayName,
          age: additionalData.age ?? 18,
          phone: additionalData.phone || '',
          guardian_phone: additionalData.guardian_phone || null,
        });
      }

      const userData = {
        id: result.user.uid,
        email: result.user.email,
        name: displayName,
        age: additionalData.age,
        phone: additionalData.phone || '',
        guardian_phone: additionalData.guardian_phone || null,
        photoURL: result.user.photoURL
      };

      setUser(userData);
      setProfile(userData);
      setConsentGiven(false);

      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    setError(null);
    try {
      // Clear consent before signing out so key is available
      clearConsent();
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
      setConsentGiven(false);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [clearConsent]);

  // ── Password Reset ─────────────────────────────────────────────────────────────
  const sendPasswordReset = useCallback(async (email) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const value = {
    user,
    profile,
    loading,
    error,
    consentGiven,
    loginWithEmail,
    loginWithGoogle,
    signupWithEmail,
    logout,
    sendPasswordReset,
    setConsent,
    clearConsent,
    hasConsent
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;