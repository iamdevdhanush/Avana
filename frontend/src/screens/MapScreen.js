import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import './MapScreen.css';

const heatmapPoints = [
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
        html: `
          <div class="user-marker-pulse"></div>
          <div class="user-marker-dot"></div>
        `,
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

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export function MapScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [routeFinding, setRouteFinding] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [liveStatus, setLiveStatus] = useState(false);
  const watchIdRef = useRef(null);
  const defaultLocation = [12.9716, 77.5946];

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
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000
        }
      );
    } else {
      setUserLocation(defaultLocation);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMapClick = (lat, lng) => {
    setSelectedLocation({ lat, lng });
    const hour = new Date().getHours();
    const isNight = hour >= 21 || hour < 6;
    
    const distance = Math.sqrt(
      Math.pow(lat - 12.9716, 2) + Math.pow(lng - 77.5946, 2)
    );
    
    if (distance < 0.02) {
      setRiskData({
        risk: 'HIGH',
        reason: 'High crime zone proximity',
        color: 'var(--red)'
      });
    } else if (distance < 0.05) {
      setRiskData({
        risk: 'MEDIUM',
        reason: 'Moderate activity area',
        color: 'var(--yellow)'
      });
    } else {
      setRiskData({
        risk: 'LOW',
        reason: isNight ? 'Stay alert, night time' : 'Low risk area',
        color: 'var(--green)'
      });
    }
  };

  const handleFindRoute = () => {
    setRouteFinding(true);
    setTimeout(() => {
      setRouteResult({
        safe: Math.random() > 0.4,
        time: Math.floor(Math.random() * 20) + 10,
        distance: (Math.random() * 4 + 1).toFixed(1)
      });
      setRouteFinding(false);
    }, 1500);
  };

  const handleReportSubmit = () => {
    setShowReportPanel(false);
    setSelectedLocation(null);
    setRiskData(null);
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
          <div className="map-legend">
            <div className="legend-item">
              <span className="legend-dot green"></span>
              Safe
            </div>
            <div className="legend-item">
              <span className="legend-dot yellow"></span>
              Caution
            </div>
            <div className="legend-item">
              <span className="legend-dot red"></span>
              Danger
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
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <HeatmapLayer points={heatmapPoints} />
            <UserMarker position={userLocation} />
            <MapClickHandler onMapClick={handleMapClick} />
          </MapContainer>
        )}
      </div>

      <div className="map-controls">
        <button 
          className="control-btn card"
          onClick={() => setShowReportPanel(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          Report
        </button>
        
        <button 
          className="control-btn primary card"
          onClick={() => setShowRoutePanel(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="3,11 22,2 13,21 11,13 3,11"/>
          </svg>
          Find Route
        </button>
      </div>

      {selectedLocation && riskData && (
        <div className="location-info-panel card">
          <div className="panel-header">
            <span 
              className="risk-badge"
              style={{ background: `${riskData.color}20`, color: riskData.color }}
            >
              {riskData.risk} RISK
            </span>
            <button 
              className="close-btn"
              onClick={() => {
                setSelectedLocation(null);
                setRiskData(null);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <p className="panel-reason">{riskData.reason}</p>
          <p className="panel-coords">
            {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
          </p>
        </div>
      )}

      {showRoutePanel && (
        <div className="panel-overlay" onClick={() => setShowRoutePanel(false)}>
          <div className="route-panel card" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>Find Safe Route</h2>
              <button className="close-btn" onClick={() => setShowRoutePanel(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="input-group">
              <label className="input-label">From</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Current location"
                defaultValue="MG Road"
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">To</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Enter destination"
              />
            </div>
            
            <button 
              className="btn btn-primary btn-block"
              onClick={handleFindRoute}
              disabled={routeFinding}
            >
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
                <p className="result-tip">
                  {routeResult.safe 
                    ? 'This route avoids high-risk zones and well-lit areas.' 
                    : 'This route passes through some areas with caution. Stay alert.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showReportPanel && (
        <div className="panel-overlay" onClick={() => setShowReportPanel(false)}>
          <div className="report-panel card" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>Report Unsafe Area</h2>
              <button className="close-btn" onClick={() => setShowReportPanel(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="input-group">
              <label className="input-label">Incident Type</label>
              <select className="input-field">
                <option>Suspicious activity</option>
                <option>Harassment</option>
                <option>Poor lighting</option>
                <option>Isolated area</option>
                <option>Other</option>
              </select>
            </div>
            
            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea 
                className="input-field textarea"
                placeholder="Describe what you observed..."
                rows="3"
              ></textarea>
            </div>
            
            <button 
              className="btn btn-danger btn-block"
              onClick={handleReportSubmit}
            >
              Submit Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
