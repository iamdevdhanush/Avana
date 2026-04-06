import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HomeScreen } from './screens/HomeScreen';
import { MapScreen } from './screens/MapScreen';
import { SafetyScreen } from './screens/SafetyScreen';
import { CommunityScreen } from './screens/CommunityScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ConsentScreen } from './screens/ConsentScreen';
import { NavigationBar } from './components/NavigationBar';
import { onAuthChange, signOut } from './services/firebaseAuth';
import { createOrGetUserProfile } from './services/userProfileService';
import './App.css';

// BUG FIX: Added global error boundary to prevent white screen on crash
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0A0A0F', color: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ marginBottom: '8px', color: '#FF3D3D' }}>Something went wrong</h2>
          <p style={{ color: '#8A8A9A', marginBottom: '24px', fontSize: '14px' }}>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: '#00C853', color: '#000', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // BUG FIX: Store handler ref to properly remove event listener
  const installPromptHandlerRef = useRef(null);

  useEffect(() => {
    // BUG FIX: Store the handler in ref so it can be properly removed
    installPromptHandlerRef.current = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', installPromptHandlerRef.current);

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await createOrGetUserProfile(firebaseUser);
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: profile?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            age: profile?.age,
            phone: profile?.phone,
            guardian_phone: profile?.guardian_phone
          });

          // BUG FIX: Guardian mode is now stored in localStorage per user session
          // so consentGiven persists across page refreshes
          const consentKey = `avana_consent_${firebaseUser.uid}`;
          const hasConsent = localStorage.getItem(consentKey) === 'true';
          setConsentGiven(hasConsent);
        } catch (error) {
          console.error('Error setting up user profile:', error);
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
          });
          setConsentGiven(false);
        }
      } else {
        setUser(null);
        setConsentGiven(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      // BUG FIX: Properly remove the event listener using the stored reference
      if (installPromptHandlerRef.current) {
        window.removeEventListener('beforeinstallprompt', installPromptHandlerRef.current);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // BUG FIX: Clear consent only on explicit logout
      if (user?.id) {
        localStorage.removeItem(`avana_consent_${user.id}`);
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setUser(null);
    setConsentGiven(false);
  };

  const handleSOS = (location) => {
    setSosTriggered(true);

    // Determine recipient: guardian if they have one, else emergency contacts
    const guardianPhone = user?.guardian_phone;
    const messageTo = guardianPhone
      ? `Guardian (${guardianPhone})`
      : 'Emergency Contacts and Authorities';

    console.log(`🚨 [SOS SYSTEM] Alert dispatched to: ${messageTo}`);
    console.log(`🚨 Time: ${new Date().toLocaleString()}`);
    if (location) {
      console.log(`🚨 Live Location: https://maps.google.com/?q=${location.lat},${location.lng}`);
    }

    // BUG FIX: Also trigger the backend SOS API for server-side logging
    if (location && user?.id) {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      fetch(`${apiBase}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: location.lat, lng: location.lng, userId: user.id })
      }).catch(err => console.error('SOS API error:', err));
    }

    setTimeout(() => setSosTriggered(false), 5000);
  };

  const handleConsentEnable = () => {
    // BUG FIX: Persist consent so it survives page refresh
    if (user?.id) {
      localStorage.setItem(`avana_consent_${user.id}`, 'true');
    }
    setConsentGiven(true);
  };

  const location = useLocation();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading Avana...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<LoginScreen onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    );
  }

  if (!consentGiven) {
    return (
      <ErrorBoundary>
        <ConsentScreen
          onEnable={handleConsentEnable}
          onDecline={handleLogout}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        {deferredPrompt && (
          <div className="install-banner">
            <p>Install Avana for a better mobile experience</p>
            <button onClick={handleInstallClick} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              Install
            </button>
          </div>
        )}
        <div className="screen-container">
          <Routes location={location}>
            <Route path="/" element={<HomeScreen onSOS={handleSOS} sosTriggered={sosTriggered} user={user} />} />
            <Route path="/map" element={<MapScreen user={user} />} />
            <Route path="/safety" element={<SafetyScreen onSOS={handleSOS} user={user} />} />
            <Route path="/community" element={<CommunityScreen user={user} />} />
            <Route path="/profile" element={<ProfileScreen onLogout={handleLogout} user={user} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <NavigationBar />

        {sosTriggered && (
          <div className="sos-overlay">
            <div className="sos-modal">
              <div className="sos-icon">🚨</div>
              <h2>Emergency Alert Sent</h2>
              <p>Your location has been shared with emergency contacts and local authorities.</p>
              <div className="sos-timer">
                <span>Help is on the way</span>
                <div className="pulse-ring"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
