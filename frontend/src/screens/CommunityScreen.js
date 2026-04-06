import React, { useState, useEffect, useCallback } from 'react';
import { getCommunityReports, saveCommunityReport, subscribeToCommunityReports } from '../services/supabase';
import './CommunityScreen.css';

const REPORT_TYPE_LABELS = {
  suspicious: 'Suspicious Activity',
  harassment: 'Harassment',
  unsafe_area: 'Unsafe Area',
  stalking: 'Stalking',
  assault: 'Assault',
  lighting: 'Poor Lighting',
  isolated: 'Isolated Area',
  other: 'Other'
};

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
}

export function CommunityScreen({ user }) {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newReport, setNewReport] = useState({
    type: 'suspicious',
    description: '',
    location: ''
  });

  const loadReports = useCallback(async () => {
    const { data } = await getCommunityReports(100);
    if (data) {
      setAlerts(data.map(r => ({
        id: r.id,
        type: r.type,
        title: REPORT_TYPE_LABELS[r.type] || 'Report',
        location: r.description?.split('.')[0] || 'Location reported',
        time: timeAgo(r.created_at),
        description: r.description || '',
        severity: r.severity || 'medium',
        lat: r.lat,
        lng: r.lng
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReports();
    
    const channel = subscribeToCommunityReports((newReport) => {
      setAlerts(prev => [{
        id: newReport.id,
        type: newReport.type,
        title: REPORT_TYPE_LABELS[newReport.type] || 'Report',
        location: newReport.description?.split('.')[0] || 'Location reported',
        time: 'Just now',
        description: newReport.description || '',
        severity: newReport.severity || 'medium',
        lat: newReport.lat,
        lng: newReport.lng
      }, ...prev]);
    });

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [loadReports]);

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => 
        filter === 'danger' ? a.severity === 'high' :
        filter === 'warning' ? a.severity === 'medium' :
        a.severity === 'low'
      );

  const handleReportSubmit = async () => {
    if (newReport.description && navigator.geolocation) {
      setSubmitting(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { error } = await saveCommunityReport({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            type: newReport.type,
            description: newReport.description,
            severity: 'medium'
          });
          setSubmitting(false);
          if (!error) {
            setShowReportModal(false);
            setNewReport({ type: 'suspicious', description: '', location: '' });
          }
        },
        async () => {
          const { error } = await saveCommunityReport({
            lat: 12.9716,
            lng: 77.5946,
            type: newReport.type,
            description: newReport.description,
            severity: 'medium'
          });
          setSubmitting(false);
          if (!error) {
            setShowReportModal(false);
            setNewReport({ type: 'suspicious', description: '', location: '' });
          }
        }
      );
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      default: return '🟢';
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      default: return 'safe';
    }
  };

  return (
    <div className="community-screen">
      <header className="page-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">Community</h1>
            <p className="page-subtitle">Stay informed, stay safe</p>
          </div>
          <button 
            className="report-btn"
            onClick={() => setShowReportModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Report
          </button>
        </div>
      </header>

      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-tab ${filter === 'danger' ? 'active' : ''}`}
          onClick={() => setFilter('danger')}
        >
          Alerts
        </button>
        <button 
          className={`filter-tab ${filter === 'warning' ? 'active' : ''}`}
          onClick={() => setFilter('warning')}
        >
          Warnings
        </button>
        <button 
          className={`filter-tab ${filter === 'info' ? 'active' : ''}`}
          onClick={() => setFilter('info')}
        >
          Info
        </button>
      </div>

      <div className="alerts-list scroll-content">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Loading Reports</h3>
            <p>Fetching community alerts...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h3>All Clear</h3>
            <p>No alerts in this category</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div key={alert.id} className={`alert-card card ${getSeverityClass(alert.severity)}`}>
              <div className="alert-header">
                <span className="alert-severity">
                  {getSeverityIcon(alert.severity)}
                </span>
                <div className="alert-meta">
                  <span className="alert-time">{alert.time}</span>
                </div>
              </div>
              <h3 className="alert-title">{alert.title}</h3>
              <p className="alert-description">{alert.description}</p>
              <div className="alert-location">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {alert.location}
              </div>
            </div>
          ))
        )}
        
        <div style={{ height: '100px' }}></div>
      </div>

      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="report-modal card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report an Incident</h2>
              <button className="close-btn" onClick={() => setShowReportModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="input-group">
              <label className="input-label">Incident Type</label>
              <select 
                className="input-field"
                value={newReport.type}
                onChange={(e) => setNewReport({...newReport, type: e.target.value})}
              >
                <option value="suspicious">Suspicious Activity</option>
                <option value="harassment">Harassment</option>
                <option value="lighting">Poor Lighting</option>
                <option value="isolated">Isolated Area</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Location</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Enter location"
                value={newReport.location}
                onChange={(e) => setNewReport({...newReport, location: e.target.value})}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea 
                className="input-field textarea"
                placeholder="Describe what you observed..."
                rows="4"
                value={newReport.description}
                onChange={(e) => setNewReport({...newReport, description: e.target.value})}
              />
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowReportModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleReportSubmit}
                disabled={!newReport.description || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>

            <p className="report-disclaimer">
              Your report helps keep the community safe. All reports are anonymous.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
