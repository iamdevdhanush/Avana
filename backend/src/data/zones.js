const riskZones = [
  { lat: 12.9716, lng: 77.5946, risk: 'HIGH', name: 'Central Business District' },
  { lat: 12.9352, lng: 77.6245, risk: 'HIGH', name: 'Industrial Area' },
  { lat: 12.9585, lng: 77.6091, risk: 'MEDIUM', name: 'Commercial Zone' },
  { lat: 12.9784, lng: 77.6408, risk: 'LOW', name: 'Residential Area' },
  { lat: 12.9450, lng: 77.5872, risk: 'HIGH', name: 'Transit Hub' },
  { lat: 12.9612, lng: 77.6017, risk: 'MEDIUM', name: 'Shopping District' },
  { lat: 12.9530, lng: 77.6145, risk: 'LOW', name: 'Park Area' },
  { lat: 12.9700, lng: 77.5800, risk: 'HIGH', name: 'Entertainment District' },
  { lat: 12.9420, lng: 77.5600, risk: 'MEDIUM', name: 'University Area' },
  { lat: 12.9850, lng: 77.5950, risk: 'LOW', name: 'Suburban Area' },
  { lat: 12.9750, lng: 77.6050, risk: 'HIGH', name: 'Night Market Area' },
  { lat: 12.9880, lng: 77.5500, risk: 'MEDIUM', name: 'Office Park' },
  { lat: 12.9100, lng: 77.6200, risk: 'LOW', name: 'Quiet Neighborhood' },
  { lat: 12.9300, lng: 77.5700, risk: 'HIGH', name: 'Railway Station Area' },
  { lat: 12.9550, lng: 77.6400, risk: 'MEDIUM', name: 'Tech Park' }
];

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
  [12.9750, 77.6050, 0.85],
  [12.9880, 77.5500, 0.45],
  [12.9100, 77.6200, 0.1],
  [12.9300, 77.5700, 0.75],
  [12.9550, 77.6400, 0.4]
];

module.exports = { riskZones, heatmapPoints };
