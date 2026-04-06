const express = require('express');
const router = express.Router();
const { riskZones } = require('../data/zones');

router.post('/', (req, res) => {
  const { lat, lng, time } = req.body;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const hour = time ? new Date(time).getHours() : new Date().getHours();
  const isNightTime = hour >= 21 || hour < 6;

  let baseRisk = 'LOW';
  let reasons = [];

  for (const zone of riskZones) {
    const distance = calculateDistance(lat, lng, zone.lat, zone.lng);
    if (distance < 0.5) {
      if (zone.risk === 'HIGH') {
        baseRisk = 'HIGH';
        reasons.push('High crime zone');
      } else if (zone.risk === 'MEDIUM' && baseRisk !== 'HIGH') {
        baseRisk = 'MEDIUM';
        reasons.push('Medium risk area');
      }
    }
  }

  let finalRisk = baseRisk;
  
  if (baseRisk === 'HIGH' && isNightTime) {
    finalRisk = 'HIGH';
    reasons.push('Late night hours');
  } else if (baseRisk === 'HIGH' && !isNightTime) {
    finalRisk = 'HIGH';
    reasons.push('Daytime - exercise caution');
  } else if (baseRisk === 'MEDIUM') {
    if (isNightTime) {
      finalRisk = 'HIGH';
      reasons.push('Nighttime in medium risk area');
    } else {
      finalRisk = 'MEDIUM';
      reasons.push('Normal business hours');
    }
  } else {
    if (isNightTime) {
      finalRisk = 'MEDIUM';
      reasons.push('Nighttime - stay alert');
    } else {
      finalRisk = 'LOW';
      reasons.push('Low risk area');
    }
  }

  res.json({
    risk: finalRisk,
    reason: reasons.join(' + '),
    timestamp: new Date().toISOString()
  });
});

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

module.exports = router;
