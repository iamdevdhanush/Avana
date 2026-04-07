import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../firebase';
import { createOrGetUserProfile } from '../services/userProfileService';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  CONSENT: 'avana_consent',
  LOCATION_PERMISSION: 'avana_location_permission'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getConsentKey = useCallback(() => {
    return user ? `${STORAGE_KEYS.CONSENT}_${user.id}` : null;
  }, [user]);

  const hasConsent = useCallback(() => {
    const key = getConsentKey();
    return key ? localStorage.getItem(key) === 'true' : false;
  }, [getConsentKey]);

  const [consentGiven, setConsentGiven] = useState(false);

  const setConsent = useCallback((value) => {
    const key = getConsentKey();
    if (key) {
      localStorage.setItem(key, value ? 'true' : 'false');
      setConsentGiven(value);
    }
  }, [getConsentKey]);

  const clearConsent = useCallback(() => {
    const key = getConsentKey();
    if (key) {
      localStorage.removeItem(key);
    }
    setConsentGiven(false);
  }, [getConsentKey]);

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

          const consentKey = `avana_consent_${firebaseUser.uid}`;
          setConsentGiven(localStorage.getItem(consentKey) === 'true');
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
  }, [setConsentGiven]);

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

      const consentKey = `avana_consent_${result.user.uid}`;
      const hasExistingConsent = localStorage.getItem(consentKey) === 'true';
      setConsentGiven(hasExistingConsent);

      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [setConsentGiven]);

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

      const consentKey = `avana_consent_${result.user.uid}`;
      const hasExistingConsent = localStorage.getItem(consentKey) === 'true';
      setConsentGiven(hasExistingConsent);

      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [setConsentGiven]);

  const signupWithEmail = useCallback(async (email, password, additionalData = {}) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      if (additionalData.name) {
        await updateProfile(result.user, { displayName: additionalData.name });
      }

      const profileData = {
        id: result.user.uid,
        name: additionalData.name || email.split('@')[0],
        age: additionalData.age || 18,
        phone: additionalData.phone || '',
        guardian_phone: additionalData.guardian_phone || null
      };

      await createOrGetUserProfile(result.user);

      const userData = {
        id: result.user.uid,
        email: result.user.email,
        name: profileData.name,
        age: profileData.age,
        phone: profileData.phone,
        guardian_phone: profileData.guardian_phone,
        photoURL: result.user.photoURL
      };

      setUser(userData);
      setProfile(profileData);
      setConsentGiven(false);

      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
      setConsentGiven(false);
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