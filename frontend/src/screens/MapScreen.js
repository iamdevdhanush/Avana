import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
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

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_CENTER = [12.9716, 77.5946]; // Bangalore, India

const CRIME_DATA = [
  { lat: 12.9716, lng: 77.5946, weight: 0.9 },
  { lat: 12.9352, lng: 77.6245, weight: 0.85 },
  { lat: 12.9585, lng: 77.6091, weight: 0.6 },
  { lat: 12.9450, lng: 77.5872, weight: 0.8 },
  { lat: 12.9700, lng: 77.5800, weight: 0.75 },
  { lat: 12.9300, lng: 77.5700, weight: 0.7 },
  { lat: 12.9750, lng: 77.6050, weight: 0.5 },
  { lat: 12.9880, lng: 77.5500, weight: 0.4 },
  { lat: 12.9784, lng: 77.6408, weight: 0.2 },
  { lat: 12.9530, lng: 77.6145, weight: 0.25 }
];

const DEFAULT_HEATMAP = CRIME_DATA.map(c => [c.lat, c.lng, c.weight]);

const REPORT_TYPES = [
  { id: 'unsafe_area', label: 'Unsafe Area', icon: '⚠️', severity: 'high' },
  { id: 'harassment', label: 'Harassment', icon: '👥', severity: 'high' },
  { id: 'stalking', label: 'Stalking', icon: '👁️', severity: 'high' },
  { id: 'suspicious', label: 'Suspicious Activity', icon: '❓', severity: 'medium' },
  { id: 'assault', label: 'Assault', icon: '🚨', severity: 'high' },
  { id: 'other', label: 'Other', icon: '📍', severity: 'low' }
];

// ─── Safety Score Calculation ──────────────────────────────────────────────────
export function calculateSafetyScore(lat, lng, reports = []) {
  const hour = new Date().getHours();
  const isNight = hour >= 21 || hour < 6;
  const isEvening = hour >= 18 && hour < 21;

  let score = 100;

  // Crime zone impact
  for (const crime of CRIME_DATA) {
    // BUG FIX: Use Haversine-approximate quick formula for degree distance
    const dlat = lat - crime.lat;
    const dlng = lng - crime.lng;
    const dist = Math.sqrt(dlat * dlat + dlng * dlng);
    if (dist < 0.02) score -= crime.weight * 30;
    else if (dist < 0.05) score -= crime.weight * 12;
  }

  // Community reports impact
  for (const report of reports) {
    if (!report.lat || !report.lng) continue;
    const dlat = lat - parseFloat(report.lat);
    const dlng = lng - parseFloat(report.lng);
    const dist = Math.sqrt(dlat * dlat + dlng * dlng);
    if (dist < 0.02) {
      score -= report.severity === 'high' ? 25 : report.severity === 'medium' ? 15 : 8;
    }
  }

  // Time-of-day penalty
  if (isNight) score -= 20;
  else if (isEvening) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// BUG FIX: Corrected OSRM URL format — coordinates must be lng,lat (not lat,lng)
export async function fetchOSRMRoute(startLatLng, endLatLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLatLng[1]},${startLatLng[0]};${endLatLng[1]},${endLatLng[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const route = data.routes[0];
    return {
      distance: route.distance,           // metres
      duration: route.duration,           // seconds
      // BUG FIX: GeoJSON coordinates are [lng, lat] — swap to [lat, lng] for Leaflet
      geometry: route.geometry.coordinates.map(c => [c[1], c[0]])
    };
  } catch (err) {
    console.error('OSRM error:', err.message);
    return null;
  }
}

// BUG FIX: Nominatim geocoding for address-to-coordinates
async function geocodeAddress(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Avana-SafetyApp/1.0' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error('Geocoding failed');
    const results = await res.json();
    if (results.length === 0) return null;
    return [parseFloat(results[0].lat), parseFloat(results[0].lon)];
  } catch (err) {
    console.error('Geocoding error:', err.message);
    return null;
  }
}

// ─── Map Ready Listener ──────────────────────────────────────────────────────
function MapReadyListener({ onReady }) {
  const map = useMap();
  useEffect(() => {
    // whenReady fires after first tile paint
    map.whenReady(() => {
      // small delay so heatmap also has time to render
      setTimeout(onReady, 300);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

// ─── Map Sub-Components (memoized to prevent rerenders) ───────────────────────

const HeatmapLayer = memo(({ points }) => {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!points?.length) return;
    if (heatRef.current) map.removeLayer(heatRef.current);
    heatRef.current = L.heatLayer(points, {
      radius: 40, blur: 30, maxZoom: 15, minOpacity: 0.55,
      gradient: { 0.3: '#00C853', 0.55: '#FFD600', 0.75: '#FF9100', 0.9: '#FF3D00' }
    }).addTo(map);
    return () => { if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null; } };
  }, [map, points]);

  return null;
});

const UserMarker = memo(({ position }) => {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!position) return;
    const icon = L.divIcon({
      className: 'user-location-marker',
      html: `<div class="user-marker-pulse"></div><div class="user-marker-dot"></div>`,
      iconSize: [24, 24], iconAnchor: [12, 12]
    });
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon }).addTo(map);
    } else {
      markerRef.current.setLatLng(position);
    }
    return () => { if (markerRef.current) { map.removeLayer(markerRef.current); markerRef.current = null; } };
  }, [map, position]);

  return null;
});

const DestinationMarker = memo(({ position }) => {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!position) return;
    const icon = L.divIcon({
      className: 'destination-marker',
      html: `<div style="width:24px;height:24px;background:#FFD600;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
      iconSize: [24, 24], iconAnchor: [12, 24]
    });
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon }).addTo(map);
    } else {
      markerRef.current.setLatLng(position);
    }
    return () => { if (markerRef.current) { map.removeLayer(markerRef.current); markerRef.current = null; } };
  }, [map, position]);

  return null;
});

const CommunityMarkers = memo(({ reports }) => {
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    markersRef.current.forEach(m => { try { map.removeLayer(m); } catch {} });
    markersRef.current = [];
    if (!reports?.length) return;

    reports.forEach(report => {
      if (!report.lat || !report.lng) return;
      const color = report.severity === 'high' ? '#FF3D00' : report.severity === 'medium' ? '#FFD600' : '#00C853';
      const icon = L.divIcon({
        className: 'community-marker',
        html: `<div style="width:22px;height:22px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:700">!</div>`,
        iconSize: [22, 22], iconAnchor: [11, 11]
      });
      const marker = L.marker([parseFloat(report.lat), parseFloat(report.lng)], { icon })
        .addTo(map)
        .bindPopup(`<div style="font-family:sans-serif;min-width:140px"><strong>${REPORT_TYPES.find(t => t.id === report.type)?.label || 'Report'}</strong><p style="margin:4px 0;font-size:12px;color:#555">${report.description || 'No description'}</p></div>`);
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(m => { try { map.removeLayer(m); } catch {} });
      markersRef.current = [];
    };
  }, [map, reports]);

  return null;
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// BUG FIX: One-shot centerer — only centers when user location first arrives,
// then never auto-re-centers so the map stays draggable
function MapCenterer({ center }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);
  useEffect(() => {
    if (center && !hasCenteredRef.current) {
      map.setView(center, map.getZoom());
      hasCenteredRef.current = true;
    }
  }, [center, map]);
  return null;
}

// ─── Route Coloring ────────────────────────────────────────────────────────────
function buildColoredSegments(coords, reports) {
  if (!coords?.length) return [];
  const step = Math.max(1, Math.floor(coords.length / 25));
  const segments = [];
  let lastScore = 100;

  for (let i = 0; i < coords.length - 1; i++) {
    const score = i % step === 0
      ? calculateSafetyScore(coords[i][0], coords[i][1], reports)
      : lastScore;
    lastScore = score;
    const color = score >= 70 ? '#00C853' : score >= 40 ? '#FFD600' : '#FF3D00';
    segments.push({ positions: [coords[i], coords[i + 1]], color });
  }
  return segments;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function MapScreen({ user }) {
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [routeFinding, setRouteFinding] = useState(false);
  const [routeSegments, setRouteSegments] = useState([]);
  const [routeResult, setRouteResult] = useState(null);
  const [liveStatus, setLiveStatus] = useState(false);
  const [communityReports, setCommunityReports] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState(DEFAULT_HEATMAP);
  const [reportType, setReportType] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  // BUG FIX: Destination field with geocoding
  const [destInput, setDestInput] = useState('');
  const [destCoordsResolved, setDestCoordsResolved] = useState(null);
  const [geocodeStatus, setGeocodeStatus] = useState(''); // '', 'loading', 'found', 'error'
  const geocodeTimerRef = useRef(null);

  const watchIdRef = useRef(null);
  const channelsRef = useRef([]);

  // ── Geolocation watch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation(DEFAULT_CENTER);
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLiveStatus(true);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (!userLocation) setUserLocation(DEFAULT_CENTER);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load community data & subscribe ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [reportsRes, eventsRes] = await Promise.all([getCommunityReports(50), getSafetyEvents(100)]);
        const reports = reportsRes.data || [];
        const events = eventsRes.data || [];
        setCommunityReports(reports);

        const pts = [...DEFAULT_HEATMAP];
        reports.forEach(r => { if (r.lat && r.lng) pts.push([parseFloat(r.lat), parseFloat(r.lng), r.severity === 'high' ? 0.9 : r.severity === 'medium' ? 0.6 : 0.3]); });
        events.forEach(e => { if (e.lat && e.lng) pts.push([parseFloat(e.lat), parseFloat(e.lng), e.risk_level === 'HIGH' ? 0.85 : 0.5]); });
        setHeatmapPoints(pts);
      } catch (err) {
        console.error('Error loading map data:', err);
      }
    })();

    const ch1 = subscribeToCommunityReports((r) => {
      setCommunityReports(prev => [r, ...prev]);
      setHeatmapPoints(prev => [...prev, [parseFloat(r.lat), parseFloat(r.lng), r.severity === 'high' ? 0.9 : 0.6]]);
    });
    const ch2 = subscribeToSafetyEvents((e) => {
      if (e.lat && e.lng) setHeatmapPoints(prev => [...prev, [parseFloat(e.lat), parseFloat(e.lng), 0.8]]);
    });
    channelsRef.current = [ch1, ch2];

    return () => channelsRef.current.forEach(ch => { try { unsubscribe(ch); } catch {} });
  }, []);

  // ── Debounced geocoding when user types a destination ─────────────────────
  // BUG FIX: This was absent before — route always silently failed
  useEffect(() => {
    setDestCoordsResolved(null);
    setGeocodeStatus('');
    if (!destInput.trim() || destInput.length < 4) return;

    clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(async () => {
      setGeocodeStatus('loading');
      const coords = await geocodeAddress(destInput);
      if (coords) {
        setDestCoordsResolved(coords);
        setGeocodeStatus('found');
      } else {
        setGeocodeStatus('error');
      }
    }, 700);

    return () => clearTimeout(geocodeTimerRef.current);
  }, [destInput]);

  // ── Map click ─────────────────────────────────────────────────────────────
  const handleMapClick = useCallback((lat, lng) => {
    setSelectedLocation({ lat, lng });
    const score = calculateSafetyScore(lat, lng, communityReports);
    const risk = score >= 70 ? 'LOW' : score >= 40 ? 'MEDIUM' : 'HIGH';
    const color = risk === 'LOW' ? 'var(--green)' : risk === 'MEDIUM' ? 'var(--yellow)' : 'var(--red)';
    const reason = risk === 'LOW' ? 'Area appears safe' : risk === 'MEDIUM' ? 'Moderate risk — stay alert' : 'High risk zone — be cautious';
    setRiskData({ risk, reason, color, score });
  }, [communityReports]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // ── Route finding ─────────────────────────────────────────────────────────
  const handleFindRoute = useCallback(async () => {
    if (!userLocation) { alert('Your location is not available yet.'); return; }

    // BUG FIX: Determine destination from typed address OR tapped map point
    let dest = destCoordsResolved;
    if (!dest && selectedLocation) {
      dest = [selectedLocation.lat, selectedLocation.lng];
    }
    if (!dest) {
      alert(destInput ? 'Could not find that location. Try a more specific address.' : 'Select a destination by typing an address or tapping on the map.');
      return;
    }

    setRouteFinding(true);
    setRouteResult(null);
    setRouteSegments([]);
    setShowRoutePanel(false);

    try {
      const data = await fetchOSRMRoute(userLocation, dest);
      if (data?.geometry) {
        const segments = buildColoredSegments(data.geometry, communityReports);
        setRouteSegments(segments);
        const avgScore = segments.length
          ? Math.round(segments.reduce((s, seg) => s + calculateSafetyScore(seg.positions[0][0], seg.positions[0][1], communityReports), 0) / segments.length)
          : 50;
        setRouteResult({
          safe: avgScore >= 50,
          time: Math.round(data.duration / 60),
          distance: (data.distance / 1000).toFixed(1),
          safetyScore: avgScore,
          destCoords: dest
        });
        setShowRoutePanel(true);
      } else {
        alert('Could not find a route. Try different locations.');
      }
    } catch (err) {
      console.error('Route error:', err);
      alert('Routing service unavailable. Try again later.');
    }
    setRouteFinding(false);
  }, [userLocation, destCoordsResolved, selectedLocation, destInput, communityReports]);

  // ── Report submission ──────────────────────────────────────────────────────
  const handleReportSubmit = async () => {
    if (!selectedLocation || !reportType) return;
    setSubmitting(true);
    try {
      const { error } = await saveCommunityReport({
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        type: reportType,
        description: reportDesc,
        severity: REPORT_TYPES.find(t => t.id === reportType)?.severity || 'medium'
      });
      if (error) throw error;
      setSubmitSuccess(true);
      setTimeout(() => {
        setShowReportForm(false);
        setSelectedLocation(null);
        setRiskData(null);
        setReportType('');
        setReportDesc('');
        setSubmitSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Report error:', err);
      alert('Failed to submit report. Please try again.');
    }
    setSubmitting(false);
  };

  const handleReportClick = () => {
    if (!userLocation) { alert('Location not available. Please enable location services.'); return; }
    setSelectedLocation({ lat: userLocation[0], lng: userLocation[1] });
    setShowReportForm(true);
  };

  const clearRoute = () => {
    setRouteSegments([]);
    setRouteResult(null);
    setDestInput('');
    setDestCoordsResolved(null);
    setGeocodeStatus('');
  };

  const mapCenter = userLocation || DEFAULT_CENTER;

  return (
    <div className="map-screen">
      {/* ── Professional loading skeleton ─── */}
      {!mapReady && (
        <div className="map-skeleton">
          <div className="map-skeleton__header">
            <div className="skeleton-bar" style={{ width: 120, height: 20 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <div className="skeleton-bar" style={{ width: 70, height: 24, borderRadius: 20 }} />
              <div className="skeleton-bar" style={{ width: 130, height: 28, borderRadius: 8 }} />
            </div>
          </div>
          <div className="map-skeleton__map">
            <div className="map-skeleton__pin">
              <div className="map-skeleton__pin-ring" />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <p className="map-skeleton__label">Loading Safety Map…</p>
          </div>
          <div className="map-skeleton__controls">
            <div className="skeleton-bar" style={{ flex: 1, height: 50, borderRadius: 12 }} />
            <div className="skeleton-bar" style={{ flex: 1, height: 50, borderRadius: 12 }} />
          </div>
        </div>
      )}

      <div className={`map-ready-wrapper ${mapReady ? 'visible' : ''}`}>
      <div className="map-header">
        <h1 className="page-title">Safety Map</h1>
        <div className="map-header-right">
          <div className={`live-indicator ${liveStatus ? 'active' : ''}`}>
            <span className="live-dot"></span>
            <span>{liveStatus ? 'Live' : 'Locating...'}</span>
          </div>
          <div className="map-legend">
            {[['green', 'Safe'], ['yellow', 'Caution'], ['red', 'Danger']].map(([c, l]) => (
              <div key={c} className="legend-item"><span className={`legend-dot ${c}`}></span>{l}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="map-container">
        {/* BUG FIX: Always render map with fallback center — was conditional causing flash */}
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <HeatmapLayer points={heatmapPoints} />
          <CommunityMarkers reports={communityReports} />
          {userLocation && <UserMarker position={userLocation} />}
          {routeResult?.destCoords && <DestinationMarker position={routeResult.destCoords} />}
          {selectedLocation && !routeResult && <DestinationMarker position={[selectedLocation.lat, selectedLocation.lng]} />}
          <MapClickHandler onMapClick={handleMapClick} />
          <MapReadyListener onReady={() => setMapReady(true)} />
          {/* Live re-center when user location first arrives */}
          {userLocation && <MapCenterer center={userLocation} />}

          {/* BUG FIX: Render colored polyline segments */}
          {routeSegments.map((seg, i) => (
            <Polyline key={i} positions={seg.positions} color={seg.color} weight={5} opacity={0.85} />
          ))}
        </MapContainer>
      </div>

      <div className="map-controls">
        <button className="control-btn card" onClick={handleReportClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          Report
        </button>

        <button className="control-btn primary card" onClick={() => { setShowRoutePanel(true); clearRoute(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="3,11 22,2 13,21 11,13 3,11"/>
          </svg>
          Route
        </button>
      </div>

      {/* Selected location info panel */}
      {selectedLocation && riskData && !showReportForm && (
        <div className="location-info-panel card">
          <div className="panel-header">
            <span className="risk-badge" style={{ background: `${riskData.color}25`, color: riskData.color }}>
              {riskData.risk} RISK · Score {riskData.score}
            </span>
            <button className="close-btn" onClick={() => { setSelectedLocation(null); setRiskData(null); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <p className="panel-reason">{riskData.reason}</p>
          <p className="panel-coords">{selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
          <button className="report-area-btn" onClick={() => setShowReportForm(true)}>Report This Area</button>
        </div>
      )}

      {/* Report form */}
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
            <div className="submit-success"><span>✅</span> Report submitted!</div>
          ) : (
            <>
              <div className="report-types">
                {REPORT_TYPES.map(type => (
                  <button key={type.id}
                    className={`type-chip ${reportType === type.id ? 'active' : ''}`}
                    onClick={() => setReportType(type.id)}
                  >
                    <span>{type.icon}</span> {type.label}
                  </button>
                ))}
              </div>
              <textarea className="report-desc" placeholder="Describe what you observed (optional)..."
                value={reportDesc} onChange={e => setReportDesc(e.target.value)} rows="3" />
              <button className="submit-report-btn btn btn-primary" onClick={handleReportSubmit}
                disabled={!reportType || submitting}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Route result panel */}
      {routeResult && (
        <div className="location-info-panel card" style={{ bottom: 100 }}>
          <div className="panel-header">
            <span className={`risk-badge`} style={{ background: routeResult.safe ? 'var(--green-dim)' : 'var(--red-dim)', color: routeResult.safe ? 'var(--green)' : 'var(--red)' }}>
              {routeResult.safe ? '✅ Safe Route' : '⚠️ Risky Route'} · Score {routeResult.safetyScore}
            </span>
            <button className="close-btn" onClick={clearRoute}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="result-stats" style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <div><strong style={{ fontSize: 20 }}>{routeResult.time}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>min</span></div>
            <div><strong style={{ fontSize: 20 }}>{routeResult.distance}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>km</span></div>
          </div>
        </div>
      )}

      {/* Route‐finding overlay panel */}
      {showRoutePanel && !routeResult && (
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
              <input type="text" className="input-field" disabled value="Your Current Location" />
            </div>

            <div className="input-group">
              <label className="input-label">To</label>
              {/* BUG FIX: Now has working Nominatim geocoding with debounce */}
              <input
                type="text"
                className="input-field"
                placeholder="Type destination or tap the map"
                value={destInput}
                onChange={e => setDestInput(e.target.value)}
              />
              {geocodeStatus === 'loading' && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>🔍 Searching...</p>
              )}
              {geocodeStatus === 'found' && (
                <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>✅ Location found</p>
              )}
              {geocodeStatus === 'error' && (
                <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>❌ Location not found. Try a different address or tap the map.</p>
              )}
              {!destInput && selectedLocation && (
                <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>📍 Using map tap: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
              )}
            </div>

            <button className="btn btn-primary btn-block" onClick={handleFindRoute}
              disabled={routeFinding || (geocodeStatus === 'loading') || (!destCoordsResolved && !selectedLocation && !destInput)}>
              {routeFinding ? '🔄 Calculating route...' : 'Find Safest Route'}
            </button>
          </div>
        </div>
      )}
      </div>{/* end map-ready-wrapper */}
    </div>
  );
}
