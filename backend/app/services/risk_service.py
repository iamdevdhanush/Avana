import math
from datetime import datetime
from typing import Optional

from app.data.zones import risk_zones


def to_rad(deg: float) -> float:
    return deg * (math.pi / 180)


def haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    R = 6371.0
    dlat = to_rad(lat2 - lat1)
    dlon = to_rad(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def calculate_risk_level(
    lat: float, lng: float, time_str: Optional[str] = None
) -> dict:
    """
    Calculate risk level based on location proximity to known risk zones
    and time of day. Mirrors the logic in `backend/src/routes/risk.js`.
    """
    hour = (
        datetime.fromisoformat(time_str).hour
        if time_str
        else datetime.now().hour
    )
    is_night = hour >= 21 or hour < 6

    base_risk = "LOW"
    reasons: list[str] = []

    for zone in risk_zones:
        distance = haversine_distance(lat, lng, zone["lat"], zone["lng"])
        if distance < 0.5:
            if zone["risk"] == "HIGH":
                if base_risk != "HIGH":
                    base_risk = "HIGH"
                    reasons.append("High crime zone")
            elif zone["risk"] == "MEDIUM" and base_risk != "HIGH":
                if base_risk == "LOW":
                    base_risk = "MEDIUM"
                    reasons.append("Medium risk area")

    final_risk = base_risk

    if base_risk == "HIGH" and is_night:
        final_risk = "HIGH"
        reasons.append("Late night hours")
    elif base_risk == "HIGH" and not is_night:
        final_risk = "HIGH"
        reasons.append("Daytime - exercise caution")
    elif base_risk == "MEDIUM":
        if is_night:
            final_risk = "HIGH"
            reasons.append("Nighttime in medium risk area")
        else:
            final_risk = "MEDIUM"
            reasons.append("Normal business hours")
    else:
        if is_night:
            final_risk = "MEDIUM"
            reasons.append("Nighttime - stay alert")
        else:
            final_risk = "LOW"
            reasons.append("Low risk area")

    return {
        "risk": final_risk,
        "reason": " + ".join(reasons),
        "timestamp": datetime.now().isoformat(),
    }


def calculate_risk_score(data: dict) -> dict:
    """
    Risk scoring algorithm ported from `calculate_riskscoringalgorith.js`.

    data = {
        routeDeviation: meters,
        timeOfDay: "day" | "night",
        crimeLevel: 0-100,
        driverRating: 1-5,
        userInactive: bool,
        unexpectedStop: bool
    }
    """
    score = 100.0

    if data.get("routeDeviation", 0) > 500:
        score -= 30
    elif data.get("routeDeviation", 0) > 300:
        score -= 15

    if data.get("timeOfDay") == "night":
        score -= 10

    score -= (data.get("crimeLevel", 0) * 0.3)

    driver = data.get("driverRating", 5)
    if driver < 3:
        score -= 15
    elif driver < 4:
        score -= 5

    if data.get("userInactive"):
        score -= 10

    if data.get("unexpectedStop"):
        score -= 20

    score = max(0, min(100, round(score)))

    if score < 40:
        status = "DANGER"
    elif score < 70:
        status = "SUSPICIOUS"
    else:
        status = "SAFE"

    return {"score": score, "status": status}
