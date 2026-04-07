import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginScreen.css';

export function LoginScreen() {
  const { loginWithEmail, loginWithGoogle, signupWithEmail, loading: authLoading, error: authError } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

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

        setSuccessMessage('Account created successfully!');
        setIsLogin(true);
        setPassword('');
        setAge('');
        setGuardianPhone('');
      }
    } catch (err) {
      let errorMessage = 'Authentication failed';
      if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Only one popup allowed at a time';
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with a different sign-in method';
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
      let errorMessage = 'Google sign-in failed';
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Only one popup allowed at a time';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google sign-in is not enabled. Please contact support.';
      } else if (err.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for Google sign-in.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="login-screen">
        <div className="login-content">
          <div className="login-header">
            <div className="logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="#00C853" strokeWidth="2.5" fill="rgba(0, 200, 83, 0.1)"/>
                <path d="M24 12L32 18V30C32 36 24 42 24 42C24 42 16 36 16 30V18L24 12Z" 
                      stroke="#00C853" strokeWidth="2" fill="none"/>
                <circle cx="24" cy="26" r="4" fill="#00C853"/>
              </svg>
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
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="#00C853" strokeWidth="2.5" fill="rgba(0, 200, 83, 0.1)"/>
              <path d="M24 12L32 18V30C32 36 24 42 24 42C24 42 16 36 16 30V18L24 12Z" 
                    stroke="#00C853" strokeWidth="2" fill="none"/>
              <circle cx="24" cy="26" r="4" fill="#00C853"/>
            </svg>
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
            <button type="button" className="forgot-link">
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
    </div>
  );
}