import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginScreen.css';

export function LoginScreen() {
  const { loginWithEmail, signupWithEmail, loading: authLoading, error: authError, clearError } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [isLogin, clearError]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateInputs = () => {
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      return false;
    }

    if (!password) {
      setError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (!isLogin) {
      if (!age || isNaN(age)) {
        setError('Please enter a valid age');
        return false;
      }
      if (parseInt(age, 10) < 18 && !guardianPhone) {
        setError('Guardian phone number is required for users under 18');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    if (!validateInputs()) {
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        const result = await signupWithEmail(email, password, {
          name: email.split('@')[0],
          age: parseInt(age, 10) || 18,
          phone: '',
          guardian_phone: parseInt(age, 10) < 18 ? guardianPhone : null
        });

        if (result?.needsVerification) {
          setNeedsVerification(true);
          setSuccessMessage('Account created! Please check your email to verify your account before signing in.');
          setEmail('');
          setPassword('');
          setAge('');
          setGuardianPhone('');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (err.message?.includes('Email not confirmed') || err.code === 'email_not_confirmed') {
        errorMessage = 'Please verify your email first. Check your inbox for the verification link.';
      } else if (err.message?.includes('Invalid login credentials') || err.message?.includes('Invalid credentials')) {
        errorMessage = 'Incorrect email or password';
      } else if (err.message?.includes('User already registered') || err.code === 'user_already_exists') {
        errorMessage = 'An account already exists with this email. Try signing in instead.';
      } else if (err.message?.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters';
      } else if (err.message?.includes('To sign up, please accept')) {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { resendConfirmationEmail } = await import('../services/supabase');
      const { error } = await resendConfirmationEmail(email);
      
      if (error) {
        setError(error.message || 'Could not resend verification email');
      } else {
        setSuccessMessage('Verification email sent! Check your inbox.');
      }
    } catch (err) {
      setError('Could not resend verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMessage('');
    setNeedsVerification(false);
  };

  if (authLoading) {
    return (
      <div className="login-screen">
        <div className="login-content">
          <div className="login-header">
            <div className="logo">
              <img src="/assets/logo.png" alt="Avana" width="48" height="48" />
            </div>
            <h1>Avana</h1>
            <p>Your personal safety companion</p>
          </div>
          <div className="auth-loading">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-content">
        <div className="login-header">
          <div className="logo">
            <img src="/assets/logo.png" alt="Avana" width="48" height="48" />
          </div>
          <h1>Avana</h1>
          <p>Your personal safety companion</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {successMessage && !error && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
              className="input-field"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {!needsVerification && (
            <div className="input-group">
              <input
                type="password"
                className="input-field"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {!isLogin && !needsVerification && (
            <>
              <div className="input-group">
                <input
                  type="number"
                  className="input-field"
                  placeholder="Age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  min="1"
                  max="120"
                  disabled={loading}
                />
              </div>
              {age && parseInt(age, 10) < 18 && (
                <div className="input-group">
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="Guardian's Phone Number"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              )}
            </>
          )}

          {needsVerification && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={handleResendVerification}
              disabled={loading}
              style={{ marginBottom: '8px' }}
            >
              Resend Verification Email
            </button>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading || needsVerification}
          >
            {loading ? 'Please wait...' : (needsVerification ? 'Check Your Email' : (isLogin ? 'Sign In' : 'Create Account'))}
          </button>
        </form>

        <p className="switch-text">
          {needsVerification ? 'Already verified? ' : (isLogin ? "Don't have an account? " : "Already have an account? ")}
          <button 
            className="switch-btn"
            onClick={handleSwitchMode}
            disabled={loading}
          >
            {needsVerification ? 'Sign In' : (isLogin ? 'Sign Up' : 'Sign In')}
          </button>
        </p>

        <p className="terms-text">
          By continuing, you agree to our{' '}
          <span>Terms of Service</span> and <span>Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
