import React, { useState, useEffect, useCallback, useRef } from 'react';
import { saveSafetyEvent, getSafetyAnalytics, subscribeToSafetyEvents, getEmergencyContacts } from '../services/supabase';
import { getPreciseLocation, getLocationLink } from '../services/locationService';
import './HomeScreen.css';

const GUARDIAN_STORAGE_KEY = 'avana_guardian_mode';
const LOCATION_STORAGE_KEY = 'avana_last_location';

export function HomeScreen({ onSOS, sosTriggered, user }) {
  const [location, setLocation] = useState({ 
    text: 'Detecting location...', 
    lat: null, 
    lng: null,
    loading: true,
    error: null
  });
  const [riskLevel, setRiskLevel] = useState('LOW');
  const [riskReason, setRiskReason] = useState('Low crime area, well-lit streets');
  const [sosConfirm, setSosConfirm] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [liveStatus, setLiveStatus] = useState(false);
  const [guardianMode, setGuardianMode] = useState(false);
  const [guardianStatus, setGuardianStatus] = useState('Inactive');

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({ type: '', description: '' });
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [emergencyContacts, setEmergencyContacts] = useState([]);

  const watchIdRef = useRef(null);
  const guardianIntervalRef = useRef(null);
  const lastLocationRef = useRef(null);

  const calculateRiskLevel = useCallback((lat, lng, hour) => {
    let risk = 'LOW';
    let reason = 'Low crime area, well-lit streets';

    if (hour >= 0 && hour < 6) {
      risk = 'HIGH';
      reason = 'Late night hours — high risk area';
    } else if (hour >= 21 && hour < 24) {
      risk = 'MEDIUM';
      reason = 'Evening hours — exercise caution';
    } else if (hour >= 18 && hour < 21) {
      risk = 'MEDIUM';
      reason = 'Dusk hours — stay alert';
    }

    return { risk, reason };
  }, []);

  const updateLocationAndRisk = useCallback(async (pos) => {
    const { latitude: lat, longitude: lng } = pos.coords;
    setLiveStatus(true);
    lastLocationRef.current = { lat, lng };

    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat, lng, timestamp: Date.now() }));

    try {
      const locationData = await getPreciseLocation(lat, lng);
      const displayLocation = locationData.sublocality 
        ? `${locationData.sublocality}, ${locationData.city || ''}`.trim()
        : locationData.formatted;
      
      setLocation(prev => ({ 
        ...prev, 
        text: displayLocation || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat, 
        lng,
        loading: false,
        error: null
      }));
    } catch (err) {
      setLocation(prev => ({
        ...prev,
        text: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
        loading: false
      }));
    }

    const hour = new Date().getHours();
    const { risk, reason } = calculateRiskLevel(lat, lng, hour);
    setRiskLevel(risk);
    setRiskReason(reason);
  }, [calculateRiskLevel]);

  const loadAnalytics = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await getSafetyAnalytics(user.id);
      if (data) setAnalytics(data);
    } catch (err) {
      console.error('Analytics error:', err);
    }
  }, [user?.id]);

  const loadEmergencyContacts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await getEmergencyContacts(user.id);
      setEmergencyContacts(data || []);
    } catch (err) {
      console.error('Contacts error:', err);
    }
  }, [user?.id]);

  const setupRealtime = useCallback(() => {
    if (!user?.id) return;
    const channel = subscribeToSafetyEvents((newEvent) => {
      if (newEvent.risk_level === 'HIGH' || newEvent.risk_level === 'CRITICAL') {
        setRiskLevel(newEvent.risk_level);
        setRiskReason('High risk activity detected nearby');
      }
      loadAnalytics();
    });

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [user?.id, loadAnalytics]);

  const startGuardianTracking = useCallback(() => {
    if (guardianIntervalRef.current) return;

    setGuardianStatus('Active');
    guardianIntervalRef.current = setInterval(() => {
      if (lastLocationRef.current) {
        const { lat, lng } = lastLocationRef.current;
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ 
          lat, lng, timestamp: Date.now(), guardian: true 
        }));
      }
    }, 10000);
  }, []);

  const stopGuardianTracking = useCallback(() => {
    if (guardianIntervalRef.current) {
      clearInterval(guardianIntervalRef.current);
      guardianIntervalRef.current = null;
    }
    setGuardianStatus('Inactive');
  }, []);

  useEffect(() => {
    const savedGuardian = localStorage.getItem(GUARDIAN_STORAGE_KEY);
    if (savedGuardian === 'true') {
      setGuardianMode(true);
    }
  }, []);

  useEffect(() => {
    if (guardianMode) {
      startGuardianTracking();
    } else {
      stopGuardianTracking();
    }
    localStorage.setItem(GUARDIAN_STORAGE_KEY, guardianMode ? 'true' : 'false');
  }, [guardianMode, startGuardianTracking, stopGuardianTracking]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, text: 'Geolocation not supported', loading: false, error: 'Not supported' }));
      return;
    }

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        updateLocationAndRisk,
        (err) => {
          console.warn('Geolocation error:', err.message);
          setLocation(prev => ({ 
            ...prev, 
            text: 'Location unavailable',
            loading: false,
            error: err.message
          }));
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    } catch (err) {
      console.error('watchPosition setup error:', err);
      setLocation(prev => ({ ...prev, text: 'Location unavailable', loading: false, error: err.message }));
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [updateLocationAndRisk]);

  useEffect(() => {
    if (user?.id) {
      loadAnalytics();
      loadEmergencyContacts();
      const cleanup = setupRealtime();
      return cleanup;
    }
  }, [user?.id, loadAnalytics, loadEmergencyContacts, setupRealtime]);

  const sendSOS = useCallback(async () => {
    if (!location.lat || !location.lng) {
      alert('Location not available. Cannot send SOS.');
      return false;
    }

    const lat = location.lat;
    const lng = location.lng;
    const locationLink = getLocationLink(lat, lng);
    const message = `🚨 EMERGENCY SOS!\n\nI need immediate help!\n\nMy location: ${locationLink}\n\nPlease help me or contact emergency services!`;

    if (emergencyContacts.length > 0) {
      const contact = emergencyContacts[0];
      const phone = contact.phone.replace(/\D/g, '');
      const waMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${phone}?text=${waMessage}`, '_blank');
    }

    try {
      await saveSafetyEvent({
        userId: user.id,
        lat,
        lng,
        riskLevel: 'CRITICAL',
        eventType: 'sos_triggered',
        description: 'Emergency SOS triggered via Avana app'
      });
    } catch (err) {
      console.error('Save SOS error:', err);
    }

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    return true;
  }, [location, emergencyContacts, user?.id]);

  const handleSOSPress = async () => {
    if (sosConfirm) {
      const success = await sendSOS();
      if (success && onSOS) {
        onSOS({ lat: location.lat, lng: location.lng });
      }
      setSosConfirm(false);
      loadAnalytics();
    } else {
      setSosConfirm(true);
      if (navigator.vibrate) navigator.vibrate(100);
      setTimeout(() => setSosConfirm(false), 5000);
    }
  };

  const handleShareLocation = useCallback(() => {
    if (!location.lat || !location.lng) {
      alert('Location not available');
      return;
    }

    const link = getLocationLink(location.lat, location.lng);
    
    if (navigator.share) {
      navigator.share({ 
        text: `My current location: ${link}`,
        title: 'My Location'
      }).catch(() => {
        navigator.clipboard.writeText(link);
        alert('Location link copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(link);
      alert('Location link copied to clipboard!');
    }
  }, [location]);

  const handleCallHelpline = () => {
    window.location.href = 'tel:112';
  };

  const handleOpenSafetyMap = () => {
    if (location.lat && location.lng) {
      window.open(`https://maps.google.com/?q=${location.lat},${location.lng}`, '_blank');
    }
  };

  const handleOpenReport = () => {
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!reportData.type || !reportData.description) {
      alert('Please select a type and describe the issue');
      return;
    }

    setReportSubmitting(true);
    try {
      await saveSafetyEvent({
        userId: user.id,
        lat: location.lat,
        lng: location.lng,
        riskLevel: 'MEDIUM',
        eventType: reportData.type,
        description: reportData.description
      });
      alert('Report submitted successfully!');
      setShowReportModal(false);
      setReportData({ type: '', description: '' });
    } catch (err) {
      console.error('Report error:', err);
      alert('Failed to submit report');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleRetryLocation = () => {
    if (navigator.geolocation) {
      setLocation(prev => ({ ...prev, loading: true, error: null }));
      navigator.geolocation.getCurrentPosition(
        updateLocationAndRisk,
        (err) => setLocation(prev => ({ ...prev, loading: false, error: err.message })),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const toggleGuardianMode = () => {
    setGuardianMode(!guardianMode);
  };

  const getRiskConfig = (level) => {
    switch (level) {
      case 'HIGH':
        return { color: 'var(--red)', bg: 'var(--red-dim)', label: 'High Risk' };
      case 'MEDIUM':
        return { color: 'var(--yellow)', bg: 'var(--yellow-dim)', label: 'Medium Risk' };
      case 'CRITICAL':
        return { color: '#FF3D00', bg: 'rgba(255,61,0,0.15)', label: 'Critical' };
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
          <div className="header-controls">
            <div className={`status-badge ${liveStatus ? 'active' : ''}`}>
              <span className="status-dot"></span>
              {liveStatus ? 'Active' : 'Locating...'}
            </div>
            <button 
              className={`guardian-toggle ${guardianMode ? 'active' : ''}`}
              onClick={toggleGuardianMode}
              title="Guardian Mode"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              <span>{guardianStatus}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="home-content scroll-content">
        <section className="location-card card">
          <div className="location-info">
            <div className="location-icon">
              {location.loading ? (
                <div className="location-spinner"></div>
              ) : location.error ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              )}
            </div>
            <div>
              <p className="location-label">Current Location</p>
              <p className="location-text">
                {location.loading ? (
                  <span className="location-loading">Detecting...</span>
                ) : location.text}
              </p>
              {location.error && (
                <button className="retry-btn" onClick={handleRetryLocation}>
                  Retry
                </button>
              )}
            </div>
          </div>
          {guardianMode && (
            <div className="guardian-indicator">
              <span className="guardian-dot"></span>
              Guardian Mode Active
            </div>
          )}
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
                  width: riskLevel === 'HIGH' || riskLevel === 'CRITICAL' ? '100%' : riskLevel === 'MEDIUM' ? '60%' : '25%',
                  background: riskConfig.color 
                }}
              ></div>
            </div>
          </div>
        </section>

        {analytics && (
          <section className="analytics-section">
            <h2 className="section-title">Your Safety Stats (30 days)</h2>
            <div className="analytics-grid">
              <div className="analytics-card">
                <span className="analytics-value">{analytics.total}</span>
                <span className="analytics-label">Total Events</span>
              </div>
              <div className="analytics-card high">
                <span className="analytics-value">{analytics.highRisk}</span>
                <span className="analytics-label">High Risk</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{analytics.mediumRisk}</span>
                <span className="analytics-label">Medium Risk</span>
              </div>
            </div>
          </section>
        )}

        <section className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-card card" onClick={handleOpenSafetyMap}>
              <div className="action-icon" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="3,11 22,2 13,21 11,13 3,11"/>
                </svg>
              </div>
              <span className="action-label">Safety Map</span>
            </button>

            <button className="action-card card" onClick={handleShareLocation}>
              <div className="action-icon" style={{ background: 'rgba(0, 122, 255, 0.15)', color: '#007AFF' }}>
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

            <button className="action-card card" onClick={handleCallHelpline}>
              <div className="action-icon" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/>
                </svg>
              </div>
              <span className="action-label">Helpline</span>
            </button>

            <button className="action-card card" onClick={handleOpenReport}>
              <div className="action-icon" style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                </svg>
              </div>
              <span className="action-label">Report</span>
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

      {showReportModal && (
        <div className="report-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="report-modal" onClick={e => e.stopPropagation()}>
            <div className="report-modal-header">
              <h2>Report Incident</h2>
              <button onClick={() => setShowReportModal(false)}>×</button>
            </div>
            <div className="report-modal-content">
              <div className="report-types">
                {[
                  { id: 'unsafe_area', label: 'Unsafe Area' },
                  { id: 'harassment', label: 'Harassment' },
                  { id: 'suspicious', label: 'Suspicious Activity' },
                  { id: 'other', label: 'Other' }
                ].map(type => (
                  <button
                    key={type.id}
                    className={`report-type-btn ${reportData.type === type.id ? 'active' : ''}`}
                    onClick={() => setReportData({ ...reportData, type: type.id })}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Describe what happened..."
                value={reportData.description}
                onChange={e => setReportData({ ...reportData, description: e.target.value })}
                rows={4}
              />
              {location.lat && location.lng && (
                <p className="report-location">
                  📍 Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
              )}
              <button 
                className="report-submit-btn"
                onClick={handleSubmitReport}
                disabled={reportSubmitting}
              >
                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}