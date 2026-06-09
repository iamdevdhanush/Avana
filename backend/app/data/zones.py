from typing import TypedDict


class RiskZone(TypedDict):
    lat: float
    lng: float
    risk: str
    name: str


class HeatmapItem(TypedDict):
    lat: float
    lng: float
    weight: float


risk_zones: list[RiskZone] = [
    {"lat": 12.9716, "lng": 77.5946, "risk": "HIGH", "name": "Central Business District"},
    {"lat": 12.9352, "lng": 77.6245, "risk": "HIGH", "name": "Industrial Area"},
    {"lat": 12.9585, "lng": 77.6091, "risk": "MEDIUM", "name": "Commercial Zone"},
    {"lat": 12.9784, "lng": 77.6408, "risk": "LOW", "name": "Residential Area"},
    {"lat": 12.9450, "lng": 77.5872, "risk": "HIGH", "name": "Transit Hub"},
    {"lat": 12.9612, "lng": 77.6017, "risk": "MEDIUM", "name": "Shopping District"},
    {"lat": 12.9530, "lng": 77.6145, "risk": "LOW", "name": "Park Area"},
    {"lat": 12.9700, "lng": 77.5800, "risk": "HIGH", "name": "Entertainment District"},
    {"lat": 12.9420, "lng": 77.5600, "risk": "MEDIUM", "name": "University Area"},
    {"lat": 12.9850, "lng": 77.5950, "risk": "LOW", "name": "Suburban Area"},
    {"lat": 12.9750, "lng": 77.6050, "risk": "HIGH", "name": "Night Market Area"},
    {"lat": 12.9880, "lng": 77.5500, "risk": "MEDIUM", "name": "Office Park"},
    {"lat": 12.9100, "lng": 77.6200, "risk": "LOW", "name": "Quiet Neighborhood"},
    {"lat": 12.9300, "lng": 77.5700, "risk": "HIGH", "name": "Railway Station Area"},
    {"lat": 12.9550, "lng": 77.6400, "risk": "MEDIUM", "name": "Tech Park"},
]

heatmap_points: list[HeatmapItem] = [
    {"lat": 12.9716, "lng": 77.5946, "weight": 0.9},
    {"lat": 12.9352, "lng": 77.6245, "weight": 0.85},
    {"lat": 12.9585, "lng": 77.6091, "weight": 0.6},
    {"lat": 12.9784, "lng": 77.6408, "weight": 0.2},
    {"lat": 12.9450, "lng": 77.5872, "weight": 0.8},
    {"lat": 12.9612, "lng": 77.6017, "weight": 0.5},
    {"lat": 12.9530, "lng": 77.6145, "weight": 0.15},
    {"lat": 12.9700, "lng": 77.5800, "weight": 0.9},
    {"lat": 12.9420, "lng": 77.5600, "weight": 0.55},
    {"lat": 12.9850, "lng": 77.5950, "weight": 0.25},
    {"lat": 12.9750, "lng": 77.6050, "weight": 0.85},
    {"lat": 12.9880, "lng": 77.5500, "weight": 0.45},
    {"lat": 12.9100, "lng": 77.6200, "weight": 0.1},
    {"lat": 12.9300, "lng": 77.5700, "weight": 0.75},
    {"lat": 12.9550, "lng": 77.6400, "weight": 0.4},
]
