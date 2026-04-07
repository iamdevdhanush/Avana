const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function getPreciseLocation(lat, lng) {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Avana-SafetyApp/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    const addr = data.address || {};

    const sublocality = 
      addr.sublocality || 
      addr.neighbourhood || 
      addr.suburb || 
      addr.district || 
      addr.city_district || 
      null;

    const city = 
      addr.city || 
      addr.town || 
      addr.village || 
      addr.municipality || 
      null;

    const state = addr.state || null;

    const result = {
      sublocality,
      city,
      state,
      fullAddress: data.display_name,
      formatted: sublocality 
        ? `${sublocality}, ${city || state}` 
        : city || data.display_name?.split(',')[0] || 'Unknown',
      lat: parseFloat(lat).toFixed(6),
      lng: parseFloat(lng).toFixed(6)
    };

    return result;
  } catch (error) {
    console.error('Precise location error:', error);
    return {
      sublocality: null,
      city: null,
      state: null,
      fullAddress: null,
      formatted: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
      lat: parseFloat(lat).toFixed(6),
      lng: parseFloat(lng).toFixed(6)
    };
  }
}

export function getLocationLink(lat, lng) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export function getGoogleMapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export async function searchNearbyPlaces(lat, lng, type = 'police') {
  try {
    const query = type === 'police' 
      ? 'police station' 
      : type === 'hospital'
      ? 'hospital'
      : type === 'women'
      ? 'women help center'
      : type;

    const response = await fetch(
      `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&lat=${lat}&lon=${lng}&format=json&limit=10&bounded=1&viewbox=${lng-0.05},${lat+0.05},${lng+0.05},${lat-0.05}`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Avana-SafetyApp/1.0'
        }
      }
    );

    if (!response.ok) throw new Error('Search failed');
    
    const results = await response.json();
    
    return results.map(place => ({
      name: place.display_name?.split(',')[0] || 'Unknown',
      fullAddress: place.display_name,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lng),
      distance: calculateDistance(lat, lng, parseFloat(place.lat), parseFloat(place.lng))
    })).sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Search places error:', error);
    return [];
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

export function createSOSMessage(userName, lat, lng) {
  const locationLink = getLocationLink(lat, lng);
  return `🚨 EMERGENCY SOS from ${userName || 'Avana User'}!\n\nI need immediate help. My current location:\n${locationLink}\n\nPlease help me or contact emergency services.`;
}

export function createWhatsAppMessage(userName, lat, lng) {
  const message = createSOSMessage(userName, lat, lng);
  return encodeURIComponent(message);
}