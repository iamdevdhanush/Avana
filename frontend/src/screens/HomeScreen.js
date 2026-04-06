import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './HomeScreen.css';

export function HomeScreen({ onSOS, sosTriggered }) {
  const [safetyMode, setSafetyMode] = useState(true);
  const [location, setLocation] = useState('Detecting location...');
  const [riskLevel, setRiskLevel] = useState('LOW');
  const [riskReason, setRiskReason] = useState('Low crime area, well-lit streets');
  const [sosConfirm, setSosConfirm] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation('MG Road, Bangalore');
          setRiskLevel('MEDIUM');
          setRiskReason('Moderate activity area, stay alert');
        },
        () => {
          setLocation('Location unavailable');
        }
      );
    }
  }, []);

  const handleSOSPress = () => {
    if (sosConfirm) {
      onSOS();
      setSosConfirm(false);
    } else {
      setSosConfirm(true);
      setTimeout(() => setSosConfirm(false), 3000);
    }
  };

  const getRiskConfig = (level) => {
    switch (level) {
      case 'HIGH':
        return { color: 'var(--red)', bg: 'var(--red-dim)', label: 'High Risk' };
      case 'MEDIUM':
        return { color: 'var(--yellow)', bg: 'var(--yellow-dim)', label: 'Medium Risk' };
      default:
        return { color: 'var(--green)', bg: 'var(--green-dim)', label: 'Low Risk' };
    }
  };

  const riskConfig = getRiskConfig(riskLevel);

  return (
    <div className="home-screen">
      <header className="home-header">
        <div className="header-top">
          <div>
            <h1 className="app-logo">Avana</h1>
            <p className="app-tagline">Your safety companion</p>
          </div>
          <div className="status-badge active">
            <span className="status-dot"></span>
            Active
          </div>
        </div>
      </header>

      <div className="home-content scroll-content">
        <section className="location-card card">
          <div className="location-info">
            <div className="location-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <p className="location-label">Current Location</p>
              <p className="location-text">{location}</p>
            </div>
          </div>
        </section>

        <section className="risk-section">
          <div 
            className="risk-card card"
            style={{ borderColor: riskConfig.color, background: riskConfig.bg }}
          >
            <div className="risk-header">
              <span className="risk-label">Risk Level</span>
              <span className="risk-value" style={{ color: riskConfig.color }}>
                {riskConfig.label}
              </span>
            </div>
            <p className="risk-reason">{riskReason}</p>
            <div className="risk-bar">
              <div 
                className="risk-bar-fill" 
                style={{ 
                  width: riskLevel === 'HIGH' ? '100%' : riskLevel === 'MEDIUM' ? '60%' : '25%',
                  background: riskConfig.color 
                }}
              ></div>
            </div>
          </div>
        </section>

        <section className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/map" className="action-card card">
              <div className="action-icon" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="3,11 22,2 13,21 11,13 3,11"/>
                </svg>
              </div>
              <span className="action-label">Navigate Safely</span>
            </Link>

            <button className="action-card card">
              <div className="action-icon" style={{ background: 'var(--blue-dim, rgba(0, 122, 255, 0.15))', color: '#007AFF' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>
              <span className="action-label">Share Location</span>
            </button>

            <button className="action-card card">
              <div className="action-icon" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <span className="action-label">Call Helpline</span>
            </button>

            <button className="action-card card">
              <div className="action-icon" style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              <span className="action-label">Report Incident</span>
            </button>
          </div>
        </section>

        <section className="safety-tips">
          <h2 className="section-title">Safety Tips</h2>
          <div className="tips-list">
            <div className="tip-card card">
              <div className="tip-icon">💡</div>
              <div className="tip-content">
                <h3>Stay Aware</h3>
                <p>Trust your instincts. If something feels wrong, it probably is.</p>
              </div>
            </div>
            <div className="tip-card card">
              <div className="tip-icon">🔦</div>
              <div className="tip-content">
                <h3>Well-Lit Routes</h3>
                <p>Prefer well-lit, populated areas especially during night hours.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="sos-container">
        <button 
          className={`sos-button ${sosConfirm ? 'confirming' : ''}`}
          onClick={handleSOSPress}
        >
          <span className="sos-ring"></span>
          <span className="sos-text">{sosConfirm ? 'TAP TO CONFIRM' : 'SOS'}</span>
        </button>
        {sosConfirm && (
          <p className="sos-hint">Tap again to send emergency alert</p>
        )}
      </div>
    </div>
  );
}
