import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HomeScreen } from './screens/HomeScreen';
import { MapScreen } from './screens/MapScreen';
import { SafetyScreen } from './screens/SafetyScreen';
import { CommunityScreen } from './screens/CommunityScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ConsentScreen } from './screens/ConsentScreen';
import { NavigationBar } from './components/NavigationBar';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [guardianMode, setGuardianMode] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setGuardianMode(false);
  };

  const handleSOS = () => {
    setSosTriggered(true);
    setTimeout(() => setSosTriggered(false), 5000);
  };

  const showNav = user && guardianMode;
  const location = useLocation();

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
      <div className="screen-container">
        <Routes location={location}>
          <Route path="/" element={<HomeScreen onSOS={handleSOS} sosTriggered={sosTriggered} />} />
          <Route path="/map" element={<MapScreen />} />
          <Route path="/safety" element={<SafetyScreen />} />
          <Route path="/community" element={<CommunityScreen />} />
          <Route path="/profile" element={<ProfileScreen onLogout={handleLogout} />} />
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
