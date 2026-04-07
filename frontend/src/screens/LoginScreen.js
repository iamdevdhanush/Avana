import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginScreen.css';

export function LoginScreen() {
  const { loginWithEmail, loginWithGoogle, signupWithEmail, sendPasswordReset, loading: authLoading, error: authError } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateInputs = () => {
    let isValid = true;
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setError('Please enter a valid email');
      isValid = false;
    }

    if (!password && isLogin) {
      setError('Password is required');
      isValid = false;
    } else if (password && password.length < 6) {
      setError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
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
        if (!age || isNaN(age)) {
          setError('Please enter a valid age');
          setLoading(false);
          return;
        }
        if (parseInt(age, 10) < 18 && !guardianPhone) {
          setError('Guardian phone number is required for users under 18');
          setLoading(false);
          return;
        }

        await signupWithEmail(email, password, {
          name: email.split('@')[0],
          age: parseInt(age, 10),
          phone: '',
          guardian_phone: parseInt(age, 10) < 18 ? guardianPhone : null
        });

        setSuccessMessage('Account created successfully! Please check your email to verify.');
        setIsLogin(true);
        setPassword('');
        setAge('');
        setGuardianPhone('');
      }
    } catch (err) {
      console.error('Auth error:', err);
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (err.code === 'auth/invalid-email' || err.message?.includes('invalid-email')) {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/wrong-password' || err.message?.includes('wrong-password')) {
        errorMessage = 'Incorrect password';
      } else if (err.code === 'auth/user-not-found' || err.message?.includes('user-not-found')) {
        errorMessage = 'No account found with this email';
      } else if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use')) {
        errorMessage = 'An account already exists with this email';
      } else if (err.code === 'auth/weak-password' || err.message?.includes('weak-password')) {
        errorMessage = 'Password should be at least 6 characters';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Sign-in was cancelled';
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google auth error:', err);
      let errorMessage = 'Google sign-in failed';
      
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Sign-in was cancelled';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google sign-in is not enabled';
      } else if (err.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for Google sign-in';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!validateEmail(resetEmail)) {
      setError('Please enter a valid email');
      return;
    }

    setResetLoading(true);
    setError('');

    try {
      await sendPasswordReset(resetEmail);
      setResetSent(true);
    } catch (err) {
      console.error('Password reset error:', err);
      let errorMessage = 'Could not send reset email';
      
      if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setResetLoading(false);
    }
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

        {successMessage && (
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
            />
          </div>

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
            />
          </div>

          {!isLogin && (
            <>
              <div className="input-group">
                <input
                  type="number"
                  className="input-field"
                  placeholder="Age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required={!isLogin}
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

          {isLogin && (
            <button type="button" className="forgot-link" onClick={() => { setShowForgotPassword(true); setError(''); }}>
              Forgot password?
            </button>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button 
          className="social-btn" 
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="switch-text">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            className="switch-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccessMessage('');
            }}
            disabled={loading}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

        <p className="terms-text">
          By continuing, you agree to our{' '}
          <span>Terms of Service</span> and <span>Privacy Policy</span>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="forgot-password-overlay">
          <div className="forgot-password-modal">
            <h2>Reset Password</h2>
            <p>Enter your email address and we'll send you a link to reset your password.</p>
            
            {resetSent ? (
              <div className="success-message">
                Password reset link sent! Check your email.
              </div>
            ) : (
              <>
                <input
                  type="email"
                  className="input-field"
                  placeholder="Email address"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
                <button 
                  className="btn btn-primary btn-block"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </>
            )}
            
            <button 
              className="forgot-password-close"
              onClick={() => { setShowForgotPassword(false); setResetEmail(''); setResetSent(false); setError(''); }}
            >
              Back to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}