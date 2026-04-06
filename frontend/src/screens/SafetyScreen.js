import React, { useState } from 'react';
import './SafetyScreen.css';

const selfDefenseTips = [
  {
    id: 1,
    title: 'Awareness',
    icon: '👁️',
    description: 'Always stay aware of your surroundings. Put away headphones when walking alone.',
    steps: [
      'Scan your environment regularly',
      'Trust your instincts',
      'Avoid distracted walking'
    ]
  },
  {
    id: 2,
    title: 'Voice Power',
    icon: '📢',
    description: 'Your voice is your first weapon. Use it confidently and loudly.',
    steps: [
      'Shout "HELP" clearly',
      'Call out specific person descriptions',
      'Use car alarms or whistles'
    ]
  },
  {
    id: 3,
    title: 'Body Language',
    icon: '💪',
    description: 'Confident body language can deter potential attackers.',
    steps: [
      'Stand tall, shoulders back',
      'Make eye contact',
      'Walk with purpose'
    ]
  },
  {
    id: 4,
    title: 'Key Chain Defense',
    icon: '🔑',
    description: 'Keys between fingers can be used as a defensive tool.',
    steps: [
      'Hold keys between fingers',
      'Aim for eyes or throat',
      'Create distance quickly'
    ]
  }
];

const emergencyGuides = [
  {
    title: 'If someone follows you',
    steps: [
      'Cross the street and change direction',
      'Enter a store or public place',
      'Call a friend or family member',
      'Call police if threat persists'
    ],
    icon: '🚶'
  },
  {
    title: 'In an unsafe situation',
    steps: [
      'Stay calm and assess options',
      'Create noise to attract attention',
      'Use pepper spray if available',
      'Run to well-lit, populated areas'
    ],
    icon: '⚠️'
  },
  {
    title: 'After an incident',
    steps: [
      'Get to a safe place immediately',
      'Call emergency services',
      'Contact a trusted friend',
      'Preserve any evidence'
    ],
    icon: '🏥'
  }
];

export function SafetyScreen() {
  const [expandedTip, setExpandedTip] = useState(null);

  return (
    <div className="safety-screen">
      <header className="page-header">
        <h1 className="page-title">Safety Hub</h1>
        <p className="page-subtitle">Tools and knowledge for your protection</p>
      </header>

      <div className="safety-content scroll-content">
        <section className="safety-section">
          <h2 className="section-title">Self-Defense Basics</h2>
          <div className="tips-grid">
            {selfDefenseTips.map((tip) => (
              <div 
                key={tip.id}
                className={`tip-card card ${expandedTip === tip.id ? 'expanded' : ''}`}
                onClick={() => setExpandedTip(expandedTip === tip.id ? null : tip.id)}
              >
                <div className="tip-header">
                  <div className="tip-icon-wrapper">
                    <span className="tip-icon">{tip.icon}</span>
                  </div>
                  <div className="tip-info">
                    <h3>{tip.title}</h3>
                    <p>{tip.description}</p>
                  </div>
                  <div className="tip-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points={expandedTip === tip.id ? "18,15 12,9 6,15" : "6,9 12,15 18,9"}/>
                    </svg>
                  </div>
                </div>
                
                {expandedTip === tip.id && (
                  <div className="tip-steps">
                    {tip.steps.map((step, idx) => (
                      <div key={idx} className="step-item">
                        <span className="step-number">{idx + 1}</span>
                        <span className="step-text">{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="safety-section">
          <h2 className="section-title">Emergency Guides</h2>
          <div className="guides-list">
            {emergencyGuides.map((guide, idx) => (
              <div key={idx} className="guide-card card">
                <div className="guide-header">
                  <span className="guide-icon">{guide.icon}</span>
                  <h3>{guide.title}</h3>
                </div>
                <ul className="guide-steps">
                  {guide.steps.map((step, stepIdx) => (
                    <li key={stepIdx}>{step}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="safety-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions">
            <button className="quick-action-btn card">
              <div className="qa-icon" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/>
                </svg>
              </div>
              <div className="qa-content">
                <h4>Emergency Helplines</h4>
                <p>Police, Women Helpline, etc.</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>

            <button className="quick-action-btn card">
              <div className="qa-icon" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="qa-content">
                <h4>Trusted Contacts</h4>
                <p>Share location with friends</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>

            <button className="quick-action-btn card">
              <div className="qa-icon" style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="qa-content">
                <h4>Report Incident</h4>
                <p>Help protect others</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
          </div>
        </section>

        <div style={{ height: '100px' }}></div>
      </div>
    </div>
  );
}
