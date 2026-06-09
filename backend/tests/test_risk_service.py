import pytest
from app.services.risk_service import (
    haversine_distance,
    calculate_risk_level,
    calculate_risk_score,
)


def test_haversine_same_point():
    assert haversine_distance(12.97, 77.59, 12.97, 77.59) < 0.01


def test_haversine_known_distance():
    d = haversine_distance(12.9716, 77.5946, 13.1989, 77.7068)
    assert 25 < d < 35


def test_risk_low():
    result = calculate_risk_level(12.91, 77.62, "2025-01-01T14:00:00")
    assert result["risk"] == "LOW"


def test_risk_high():
    result = calculate_risk_level(12.9716, 77.5946, "2025-01-01T23:00:00")
    assert result["risk"] == "HIGH"
    assert "Late night" in result["reason"]


def test_risk_medium_night():
    result = calculate_risk_level(12.9585, 77.6091, "2025-01-01T22:00:00")
    assert result["risk"] == "HIGH"
    assert "Nighttime" in result["reason"]


def test_risk_without_time():
    result = calculate_risk_level(12.91, 77.62)
    assert result["risk"] in ("LOW", "MEDIUM", "HIGH")
    assert "timestamp" in result


def test_risk_returns_reason():
    result = calculate_risk_level(12.91, 77.62)
    assert isinstance(result["reason"], str)
    assert len(result["reason"]) > 0


def test_risk_high_in_daytime():
    result = calculate_risk_level(12.9716, 77.5946, "2025-01-01T14:00:00")
    assert result["risk"] == "HIGH"
    assert "Daytime" in result["reason"]


def test_risk_low_night():
    result = calculate_risk_level(12.91, 77.62, "2025-01-01T23:00:00")
    assert result["risk"] == "MEDIUM"
    assert "Nighttime" in result["reason"]


def test_risk_score_safe():
    result = calculate_risk_score({
        "routeDeviation": 0,
        "timeOfDay": "day",
        "crimeLevel": 10,
        "driverRating": 5,
        "userInactive": False,
        "unexpectedStop": False,
    })
    assert result["status"] == "SAFE"
    assert result["score"] >= 70


def test_risk_score_danger():
    result = calculate_risk_score({
        "routeDeviation": 600,
        "timeOfDay": "night",
        "crimeLevel": 80,
        "driverRating": 2,
        "userInactive": True,
        "unexpectedStop": True,
    })
    assert result["status"] == "DANGER"
    assert result["score"] < 40


def test_risk_score_suspicious():
    result = calculate_risk_score({
        "routeDeviation": 400,
        "timeOfDay": "night",
        "crimeLevel": 50,
        "driverRating": 3,
        "userInactive": False,
        "unexpectedStop": False,
    })
    assert result["status"] == "SUSPICIOUS"
    assert 40 <= result["score"] < 70


def test_risk_score_bounds():
    result = calculate_risk_score({
        "routeDeviation": 10000,
        "timeOfDay": "night",
        "crimeLevel": 100,
        "driverRating": 1,
        "userInactive": True,
        "unexpectedStop": True,
    })
    assert 0 <= result["score"] <= 100
