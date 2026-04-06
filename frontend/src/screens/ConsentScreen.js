import React, { useState } from 'react';
import './ConsentScreen.css';

export function ConsentScreen({ onEnable, onDecline }) {
  const [enabled, setEnabled] = useState(false);

  const handleEnable = () => {
    if (enabled) {
      onEnable();
    }
  };

  return (
    <div className="consent-screen">
      <div className="consent-content">
        <div className="consent-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="#00C853" strokeWidth="2" fill="rgba(0, 200, 83, 0.1)"/>
            <path d="M32 16L44 24V40C44 48 32 56 32 56C32 56 20 48 20 40V24L32 16Z" 
                  stroke="#00C853" strokeWidth="2" fill="none"/>
            <path d="M28 32L32 36L40 28" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1>Your Safety, Your Control</h1>
        <p className="consent-intro">
          Avana provides real-time safety monitoring and emergency support. 
          Here's how we protect you:
        </p>

        <div className="features-list">
          <div className="feature-item">
            <div className="feature-icon">📍</div>
            <div className="feature-content">
              <h3>Location Monitoring</h3>
              <p>Real-time location tracking for accurate risk assessment and emergency response</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">🔍</div>
            <div className="feature-content">
              <h3>Pattern Analysis</h3>
              <p>Monitors movement patterns to detect anomalies and potential threats</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <div className="feature-content">
              <h3>Privacy First</h3>
              <p>End-to-end encryption. Your data is never shared without your consent</p>
            </div>
          </div>
        </div>

        <div className="toggle-section">
          <div className="toggle-info">
            <span className="toggle-title">Enable Guardian Mode</span>
            <span className="toggle-status">
              {enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <button 
            className={`toggle-switch ${enabled ? 'active' : ''}`}
            onClick={() => setEnabled(!enabled)}
          >
            <div className="toggle-knob"></div>
          </button>
        </div>

        <div className="consent-actions">
          <button 
            className={`btn btn-block ${enabled ? 'btn-primary' : ''}`}
            onClick={handleEnable}
            disabled={!enabled}
          >
            Enable Guardian Mode
          </button>
          <button 
            className="btn btn-secondary btn-block"
            onClick={onDecline}
          >
            Not Now
          </button>
        </div>

        <p className="consent-footer">
          You can disable Guardian Mode anytime from Settings. Location data is only 
          used for safety purposes and is never sold or shared with third parties.
        </p>
      </div>
    </div>
  );
}
