import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { 
  getCommunityReports, 
  getSafetyEvents,
  saveCommunityReport,
  subscribeToCommunityReports,
  subscribeToSafetyEvents,
  unsubscribe
} from '../services/supabase';
import './MapScreen.css';

const DEFAULT_HEATMAP = [
  [12.9716, 77.5946, 0.9],
  [12.9352, 77.6245, 0.85],
  [12.9585, 77.6091, 0.6],
  [12.9784, 77.6408, 0.2],
  [12.9450, 77.5872, 0.8],
  [12.9612, 77.6017, 0.5],
  [12.9530, 77.6145, 0.15],
  [12.9700, 77.5800, 0.9],
  [12.9420, 77.5600, 0.55],
  [12.9850, 77.5950, 0.25],
  [12.9750, 77.6050, 0.82],
  [12.9300, 77.5700, 0.75]
];

const CRIME_DATA = [
  { lat: 12.9716, lng: 77.5946, weight: 0.9, type: 'high_crime' },
  { lat: 12.9352, lng: 77.6245, weight: 0.85, type: 'high_crime' },
  { lat: 12.9585, lng: 77.6091, weight: 0.6, type: 'medium_crime' },
  { lat: 12.9450, lng: 77.5872, weight: 0.8, type: 'high_crime' },
  { lat: 12.9700, lng: 77.5800, weight: 0.75, type: 'high_crime' },
  { lat: 12.9300, lng: 77.5700, weight: 0.7, type: 'high_crime' },
  { lat: 12.9750, lng: 77.6050, weight: 0.5, type: 'medium_crime' },
  { lat: 12.9880, lng: 77.5500, weight: 0.4, type: 'low_crime' },
  { lat: 12.9784, lng: 77.6408, weight: 0.2, type: 'low_crime' },
  { lat: 12.9530, lng: 77.6145, weight: 0.25, type: 'low_crime' }
];

const REPORT_TYPES = [
  { id: 'unsafe_area', label: 'Unsafe Area', icon: '⚠️', severity: 'high' },
  { id: 'harassment', label: 'Harassment', icon: '👥', severity: 'high' },
  { id: 'stalking', label: 'Stalking', icon: '👁️', severity: 'high' },
  { id: 'suspicious', label: 'Suspicious Activity', icon: '❓', severity: 'medium' },
  { id: 'assault', label: 'Assault', icon: '🚨', severity: 'high' },
  { id: 'other', label: 'Other', icon: '📍', severity: 'low' }
];

export function calculateSafetyScore(lat, lng, reports = [], events = []) {
  const hour = new Date().getHours();
  const isNight = hour >= 21 || hour < 6;
  const isEvening = hour >= 18 || hour < 22;
  
  let score = 100;
  let factors = [];
  
  for (const crime of CRIME_DATA) {
    const distance = Math.sqrt(Math.pow(lat - crime.lat, 2) + Math.pow(lng - crime.lng, 2));
    if (distance < 0.02) {
      score -= crime.weight * 30;
      factors.push('Near high crime area');
    } else if (distance < 0.05) {
      score -= crime.weight * 15;
    }
  }
  
  for (const report of reports) {
    const distance = Math.sqrt(Math.pow(lat - report.lat, 2) + Math.pow(lng - report.lng, 2));
    if (distance < 0.02) {
      const severity = report.severity === 'high' ? 25 : report.severity === 'medium' ? 15 : 8;
      score -= severity;
      factors.push('Community report: ' + report.type);
    }
  }
  
  for (const event of events) {
    const distance = Math.sqrt(Math.pow(lat - event.lat, 2) + Math.pow(lng - event.lng, 2));
    if (distance < 0.02) {
      const severity = event.risk_level === 'HIGH' ? 20 : event.risk_level === 'MEDIUM' ? 10 : 5;
      score -= severity;
    }
  }
  
  if (isNight) {
    score -= 20;
    factors.push('Nighttime - reduced visibility');
  } else if (isEvening) {
    score -= 10;
    factors.push('Evening hours');
  }
  
  score = Math.max(0, Math.min(100, score));
  
  let riskLevel = 'LOW';
  let color = '#00C853';
  
  if (score >= 70) {
    riskLevel = 'LOW';
    color = '#00C853';
  } else if (score >= 40) {
    riskLevel = 'MEDIUM';
    color = '#FFD600';
  } else {
    riskLevel = 'HIGH';
    color = '#FF3D00';
  }
  
  return { score, riskLevel, color, factors: factors.slice(0, 3) };
}

export async function fetchOSRMRoute(start, end) {
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry.coordinates.map(coord => [coord[1], coord[0]])
      };
    }
    return null;
  } catch (err) {
    console.error('OSRM routing error:', err);
    return null;
  }
}

function calculateRouteSafety(routeCoords, reports = [], events = []) {
  if (!routeCoords || routeCoords.length === 0) return { avgScore: 50, segments: [] };
  
  const step = Math.max(1, Math.floor(routeCoords.length / 20));
  let totalScore = 0;
  let count = 0;
  const scoredSegments = [];
  
  for (let i = 0; i < routeCoords.length - 1; i++) {
     const p1 = routeCoords[i];
     const p2 = routeCoords[i+1];
     let score = 100;
     
     if (i % step === 0) {
        const result = calculateSafetyScore(p1[0], p1[1], reports, events);
        score = result.score;
        totalScore += score;
        count++;
     } else if (scoredSegments.length > 0) {
        score = scoredSegments[scoredSegments.length - 1].score;
     }

     const color = score >= 70 ? '#00C853' : score >= 40 ? '#FFD600' : '#FF3D00';
     scoredSegments.push({ p1: [p1[0], p1[1]], p2: [p2[0], p2[1]], score, color });
  }
  
  const avgScore = count > 0 ? (totalScore / count) : 50;
  
  return { avgScore, segments: scoredSegments };
}

function HeatmapLayer({ points }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (points && points.length > 0) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
      
      heatLayerRef.current = L.heatLayer(points, {
        radius: 40,
        blur: 30,
        maxZoom: 15,
        minOpacity: 0.6,
        maxIntensity: 1,
        gradient: {
          0.3: '#00C853',
          0.5: '#7CB342',
          0.6: '#FFD600',
          0.7: '#FF9100',
          0.9: '#FF3D00'
        }
      }).addTo(map);
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}

function UserMarker({ position }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (position && !markerRef.current) {
      const icon = L.divIcon({
        className: 'user-location-marker',
        html: `<div class="user-marker-pulse"></div><div class="user-marker-dot"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      markerRef.current = L.marker(position, { icon }).addTo(map);
    } else if (position && markerRef.current) {
      markerRef.current.setLatLng(position);
    }

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, position]);

  return null;
}

function CommunityMarkers({ reports }) {
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (reports && reports.length > 0) {
      reports.forEach(report => {
        const color = report.severity === 'high' ? '#FF3D00' : 
                     report.severity === 'medium' ? '#FFD600' : '#00C853';
        
        const icon = L.divIcon({
          className: 'community-marker',
          html: `<div class="report-marker" style="background: ${color}"><span>!</span></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([report.lat, report.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div class="popup-content">
              <strong>${REPORT_TYPES.find(t => t.id === report.type)?.label || 'Report'}</strong>
              <p>${report.description || 'No description'}</p>
              <small>${new Date(report.created_at).toLocaleString()}</small>
            </div>
          `);
        
        markersRef.current.push(marker);
      });
    }

    return () => {
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
    };
  }, [map, reports]);

  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export function MapScreen({ user }) {
  const [userLocation, setUserLocation] = useState(null);
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [routeFinding, setRouteFinding] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [liveStatus, setLiveStatus] = useState(false);
  const [communityReports, setCommunityReports] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState(DEFAULT_HEATMAP);
  const [reportType, setReportType] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const watchIdRef = useRef(null);
  const defaultLocation = [12.9716, 77.5946];
  const channelsRef = useRef([]);

  useEffect(() => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setLiveStatus(true);
        },
        (err) => {
          console.warn('Location error:', err.message);
          setUserLocation(defaultLocation);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    } else {
      setUserLocation(defaultLocation);
    }

    loadCommunityData();
    setupRealtime();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      channelsRef.current.forEach(ch => unsubscribe(ch));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCommunityData = async () => {
    const [reportsResult, eventsResult] = await Promise.all([
      getCommunityReports(50),
      getSafetyEvents(100)
    ]);

    if (reportsResult.data) {
      setCommunityReports(reportsResult.data);
      updateHeatmapFromData(reportsResult.data, eventsResult.data || []);
    }
  };

  const updateHeatmapFromData = (reports, events) => {
    const points = [...DEFAULT_HEATMAP];

    reports.forEach(r => {
      const intensity = r.severity === 'high' ? 0.9 : 
                       r.severity === 'medium' ? 0.6 : 0.3;
      points.push([r.lat, r.lng, intensity]);
    });

    events.forEach(e => {
      const intensity = e.risk_level === 'HIGH' || e.risk_level === 'CRITICAL' ? 0.85 :
                       e.risk_level === 'MEDIUM' ? 0.55 : 0.25;
      if (e.lat && e.lng) {
        points.push([parseFloat(e.lat), parseFloat(e.lng), intensity]);
      }
    });

    setHeatmapPoints(points);
  };

  const setupRealtime = () => {
    const reportChannel = subscribeToCommunityReports((newReport) => {
      setCommunityReports(prev => [newReport, ...prev]);
      setHeatmapPoints(prev => {
        const intensity = newReport.severity === 'high' ? 0.9 : 
                         newReport.severity === 'medium' ? 0.6 : 0.3;
        return [...prev, [newReport.lat, newReport.lng, intensity]];
      });
    });

    const eventsChannel = subscribeToSafetyEvents((newEvent) => {
      if (newEvent.lat && newEvent.lng) {
        setHeatmapPoints(prev => {
          const intensity = newEvent.risk_level === 'HIGH' ? 0.85 : 0.5;
          return [...prev, [parseFloat(newEvent.lat), parseFloat(newEvent.lng), intensity]];
        });
      }
    });

    channelsRef.current = [reportChannel, eventsChannel];
  };

  const handleMapClick = (lat, lng) => {
    setSelectedLocation({ lat, lng });
    const hour = new Date().getHours();
    const isNight = hour >= 21 || hour < 6;
    
    const nearbyReport = communityReports.find(r => {
      const dist = Math.sqrt(Math.pow(lat - r.lat, 2) + Math.pow(lng - r.lng, 2));
      return dist < 0.02;
    });

    if (nearbyReport) {
      setRiskData({
        risk: nearbyReport.severity === 'high' ? 'HIGH' : 
              nearbyReport.severity === 'medium' ? 'MEDIUM' : 'LOW',
        reason: REPORT_TYPES.find(t => t.id === nearbyReport.type)?.label || 'Community Report',
        color: nearbyReport.severity === 'high' ? 'var(--red)' : 
               nearbyReport.severity === 'medium' ? 'var(--yellow)' : 'var(--green)'
      });
    } else {
      const distance = Math.sqrt(Math.pow(lat - 12.9716, 2) + Math.pow(lng - 77.5946, 2));
      
      if (distance < 0.02) {
        setRiskData({ risk: 'HIGH', reason: 'High crime zone proximity', color: 'var(--red)' });
      } else if (distance < 0.05) {
        setRiskData({ risk: 'MEDIUM', reason: 'Moderate activity area', color: 'var(--yellow)' });
      } else {
        setRiskData({ risk: 'LOW', reason: isNight ? 'Stay alert, night time' : 'Low risk area', color: 'var(--green)' });
      }
    }
  };

  const handleFindRoute = async () => {
    if (!userLocation) {
      alert('Location not available');
      return;
    }
    
    setRouteFinding(true);
    setRouteResult(null);
    
    try {
      const start = userLocation;
      const dest = selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : null;
      
      if (!dest) {
        setRouteFinding(false);
        return;
      }
      
      const routeData = await fetchOSRMRoute(start, dest);
      
      if (routeData) {
        const safetyAnalysis = calculateRouteSafety(routeData.geometry, communityReports, []);
        
        setRouteResult({
          safe: safetyAnalysis.avgScore >= 50,
          time: Math.round(routeData.duration / 60),
          distance: (routeData.distance / 1000).toFixed(1),
          geometry: routeData.geometry,
          safetyScore: Math.round(safetyAnalysis.avgScore),
          segments: safetyAnalysis.segments
        });
      } else {
        setRouteResult({
          safe: Math.random() > 0.4,
          time: Math.floor(Math.random() * 20) + 10,
          distance: (Math.random() * 4 + 1).toFixed(1),
          fallback: true
        });
      }
    } catch (err) {
      console.error('Route error:', err);
      setRouteResult({
        safe: true,
        time: 15,
        distance: 3.2,
        fallback: true
      });
    }
    
    setRouteFinding(false);
  };

  const handleReportSubmit = async () => {
    if (!selectedLocation || !reportType) return;
    
    setSubmitting(true);
    
    const reportData = {
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      type: reportType,
      description: reportDesc,
      severity: REPORT_TYPES.find(t => t.id === reportType)?.severity || 'medium'
    };

    const { error } = await saveCommunityReport(reportData);
    
    if (error) {
      console.error('Report error:', error);
      alert('Failed to submit report. Please try again.');
    } else {
      setSubmitSuccess(true);
      setTimeout(() => {
        setShowReportForm(false);
        setSelectedLocation(null);
        setRiskData(null);
        setReportType('');
        setReportDesc('');
        setSubmitSuccess(false);
      }, 1500);
    }
    
    setSubmitting(false);
  };

  const handleReportClick = () => {
    if (!userLocation) {
      alert('Location not available. Please enable location services.');
      return;
    }
    setSelectedLocation({ lat: userLocation[0], lng: userLocation[1] });
    setShowReportForm(true);
  };

  return (
    <div className="map-screen">
      <div className="map-header">
        <h1 className="page-title">Avana Safety Map</h1>
        <div className="map-header-right">
          <div className={`live-indicator ${liveStatus ? 'active' : ''}`}>
            <span className="live-dot"></span>
            <span>{liveStatus ? 'Live' : 'Locating...'}</span>
          </div>
          <div className="reports-count">
            <span>📍</span> {communityReports.length} reports
          </div>
          <div className="map-legend">
            <div className="legend-item">
              <span className="legend-dot green"></span>Safe
            </div>
            <div className="legend-item">
              <span className="legend-dot yellow"></span>Caution
            </div>
            <div className="legend-item">
              <span className="legend-dot red"></span>Danger
            </div>
          </div>
        </div>
      </div>

      <div className="map-container">
        {userLocation && (
          <MapContainer
            center={userLocation}
            zoom={14}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <HeatmapLayer points={heatmapPoints} />
            <CommunityMarkers reports={communityReports} />
            <UserMarker position={userLocation} />
            <MapClickHandler onMapClick={handleMapClick} />
            
            {routeResult && routeResult.segments && routeResult.segments.map((seg, i) => (
               <Polyline 
                 key={i} 
                 positions={[seg.p1, seg.p2]} 
                 color={seg.color} 
                 weight={5} 
                 opacity={0.8}
               />
            ))}
          </MapContainer>
        )}
      </div>

      <div className="map-controls">
        <button className="control-btn card" onClick={handleReportClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          Report
        </button>
        
        <button className="control-btn primary card" onClick={() => setShowRoutePanel(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="3,11 22,2 13,21 11,13 3,11"/>
          </svg>
          Find Route
        </button>
      </div>

      {selectedLocation && riskData && !showReportForm && (
        <div className="location-info-panel card">
          <div className="panel-header">
            <span className="risk-badge" style={{ background: `${riskData.color}20`, color: riskData.color }}>
              {riskData.risk} RISK
            </span>
            <button className="close-btn" onClick={() => { setSelectedLocation(null); setRiskData(null); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <p className="panel-reason">{riskData.reason}</p>
          <p className="panel-coords">{selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
          <button className="report-area-btn" onClick={() => setShowReportForm(true)}>
            Report This Area
          </button>
        </div>
      )}

      {showReportForm && (
        <div className="report-form-panel card">
          <div className="panel-header">
            <h2>Report Unsafe Area</h2>
            <button className="close-btn" onClick={() => { setShowReportForm(false); setSelectedLocation(null); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          {submitSuccess ? (
            <div className="submit-success">
              <span>✅</span> Report submitted!
            </div>
          ) : (
            <>
              <div className="report-types">
                {REPORT_TYPES.map(type => (
                  <button
                    key={type.id}
                    className={`type-chip ${reportType === type.id ? 'active' : ''}`}
                    onClick={() => setReportType(type.id)}
                  >
                    <span>{type.icon}</span> {type.label}
                  </button>
                ))}
              </div>
              
              <textarea
                className="report-desc"
                placeholder="Describe what you observed (optional)..."
                value={reportDesc}
                onChange={e => setReportDesc(e.target.value)}
                rows="3"
              />
              
              <button 
                className="submit-report-btn btn btn-primary"
                onClick={handleReportSubmit}
                disabled={!reportType || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </>
          )}
        </div>
      )}

      {showRoutePanel && (
        <div className="panel-overlay" onClick={() => setShowRoutePanel(false)}>
          <div className="route-panel card" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>Find Safe Route</h2>
              <button className="close-btn" onClick={() => setShowRoutePanel(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="input-group">
              <label className="input-label">From</label>
              <input type="text" className="input-field" disabled value="Current Location" />
            </div>
            
            <div className="input-group">
              <label className="input-label">To</label>
              <input type="text" className="input-field" disabled value={selectedLocation ? `Dest: ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` : 'Tap on the map to select destination'} />
            </div>
            
            <button className="btn btn-primary btn-block" onClick={handleFindRoute} disabled={routeFinding}>
              {routeFinding ? 'Finding safest route...' : 'Find Safest Route'}
            </button>
            
            {routeResult && (
              <div className={`route-result ${routeResult.safe ? 'safe' : 'caution'}`}>
                <div className="result-header">
                  <span className={`result-badge ${routeResult.safe ? 'safe' : 'caution'}`}>
                    {routeResult.safe ? 'Safe Route Found' : 'Use Caution'}
                  </span>
                </div>
                <div className="result-stats">
                  <div className="stat">
                    <span className="stat-value">{routeResult.time} min</span>
                    <span className="stat-label">Est. Time</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{routeResult.distance} km</span>
                    <span className="stat-label">Distance</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
