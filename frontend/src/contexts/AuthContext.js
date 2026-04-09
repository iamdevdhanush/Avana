import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signUp as supabaseSignUp,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  getCurrentUser,
  onAuthStateChange,
  saveUserProfile,
  getUserProfile
} from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);

  const loadUserProfile = useCallback(async (userId) => {
    try {
      const { data, error: profileError } = await getUserProfile(userId);
      if (profileError) {
        console.warn('[Auth] Could not load profile:', profileError);
      }
      return data;
    } catch (err) {
      console.error('[Auth] Load profile error:', err);
      return null;
    }
  }, []);

  const syncUserState = useCallback(async (supabaseUser) => {
    if (supabaseUser) {
      const userData = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
        phone: supabaseUser.user_metadata?.phone || '',
        guardian_phone: supabaseUser.user_metadata?.guardian_phone || null,
      };

      setUser(userData);

      const userProfile = await loadUserProfile(supabaseUser.id);
      if (userProfile) {
        setProfile(userProfile);
      } else {
        setProfile(userData);
      }

      const consentKey = `avana_consent_${supabaseUser.id}`;
      setConsentGiven(localStorage.getItem(consentKey) === 'true');
    } else {
      setUser(null);
      setProfile(null);
      setConsentGiven(false);
    }
  }, [loadUserProfile]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (mounted) {
          await syncUserState(currentUser);
          setLoading(false);
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth event:', event);
      
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setProfile(null);
        setConsentGiven(false);
        setLoading(false);
      } else if (session?.user) {
        await syncUserState(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncUserState]);

  const loginWithEmail = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabaseSignIn(email, password);

      if (signInError) {
        throw signInError;
      }

      if (!data.user?.email_confirmed_at) {
        await supabaseSignOut();
        throw new Error('Please verify your email before signing in. Check your inbox for the verification link.');
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
        phone: data.user.user_metadata?.phone || '',
        guardian_phone: data.user.user_metadata?.guardian_phone || null,
      };

      setUser(userData);

      const userProfile = await loadUserProfile(data.user.id);
      setProfile(userProfile || userData);

      const consentKey = `avana_consent_${data.user.id}`;
      setConsentGiven(localStorage.getItem(consentKey) === 'true');

      return userData;
    } catch (err) {
      console.error('[Auth] Login error:', err);
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadUserProfile]);

  const signupWithEmail = useCallback(async (email, password, additionalData = {}) => {
    setError(null);
    setLoading(true);

    try {
      const displayName = additionalData.name || email.split('@')[0];
      
      const { data, error: signUpError } = await supabaseSignUp(email, password, {
        name: displayName,
        age: additionalData.age || 18,
        phone: additionalData.phone || '',
        guardian_phone: additionalData.guardian_phone || null,
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user && !data.user.email_confirmed_at) {
        await saveUserProfile({
          id: data.user.id,
          name: displayName,
          age: additionalData.age || 18,
          phone: additionalData.phone || '',
          guardian_phone: additionalData.guardian_phone || null,
        });

        return {
          needsVerification: true,
          message: 'Account created! Please check your email to verify your account before signing in.'
        };
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: displayName,
        age: additionalData.age,
        phone: additionalData.phone || '',
        guardian_phone: additionalData.guardian_phone || null,
      };

      setUser(userData);
      setProfile(userData);

      return userData;
    } catch (err) {
      console.error('[Auth] Signup error:', err);
      setError(err.message || 'Signup failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);

    try {
      const { error: signOutError } = await supabaseSignOut();
      if (signOutError) {
        throw signOutError;
      }

      setUser(null);
      setProfile(null);
      setConsentGiven(false);
    } catch (err) {
      console.error('[Auth] Logout error:', err);
      setError(err.message || 'Logout failed');
      throw err;
    }
  }, []);

  const setConsent = useCallback((value) => {
    if (user?.id) {
      const consentKey = `avana_consent_${user.id}`;
      localStorage.setItem(consentKey, value ? 'true' : 'false');
    }
    setConsentGiven(value);
  }, [user]);

  const clearConsent = useCallback(() => {
    if (user?.id) {
      const consentKey = `avana_consent_${user.id}`;
      localStorage.removeItem(consentKey);
    }
    setConsentGiven(false);
  }, [user]);

  const value = {
    user,
    profile,
    loading,
    error,
    consentGiven,
    loginWithEmail,
    signupWithEmail,
    logout,
    setConsent,
    clearConsent,
    clearError: () => setError(null)
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
