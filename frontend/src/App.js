import React, { useState, useEffect } from 'react';
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
import { createOrGetUserProfile, requiresGuardianPhone } from './services/userProfileService';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [guardianMode, setGuardianMode] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get or create user profile in Supabase
          const profile = await createOrGetUserProfile(firebaseUser);
          
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: profile.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            age: profile.age,
            phone: profile.phone,
            guardian_phone: profile.guardian_phone
          });
          
          // Check if user needs guardian mode (age < 18)
          const needsGuardian = await requiresGuardianPhone(firebaseUser.uid);
          setGuardianMode(needsGuardian);
        } catch (error) {
          console.error('Error setting up user profile:', error);
          // Fallback to basic user data
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
          });
          setGuardianMode(false);
        }
      } else {
        setUser(null);
        setGuardianMode(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('beforeinstallprompt', () => {});
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setGuardianMode(false);
  };

  const handleSOS = (location) => {
    setSosTriggered(true);
    
    // Simulate SMS dispatch
    let messageTo = (user && guardianMode && user.guardian_phone) 
       ? `Guardian (${user.guardian_phone})` 
       : 'Emergency Contacts and Authorities';
       
    console.log(`🚨 [SOS SYSTEM] Alert dispatched to: ${messageTo}`);
    console.log(`🚨 Time: ${new Date().toLocaleString()}`);
    if (location) {
      console.log(`🚨 Live Location: https://maps.google.com/?q=${location.lat},${location.lng}`);
    }

    setTimeout(() => setSosTriggered(false), 5000);
  };

  const showNav = user && guardianMode;
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
      <Routes>
        <Route path="/" element={<LoginScreen onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (!guardianMode) {
    return (
      <ConsentScreen 
        onEnable={() => setGuardianMode(true)} 
        onDecline={handleLogout}
      />
    );
  }

  return (
    <div className="app-container">
      {deferredPrompt && (
        <div className="install-banner">
           <p>Install Avana for a better mobile experience</p>
           <button onClick={handleInstallClick} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>Install</button>
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
      
      {showNav && <NavigationBar />}

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
  );
}

export default App;
