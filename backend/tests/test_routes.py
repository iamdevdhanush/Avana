import pytest
from httpx import AsyncClient, ASGITransport

from app.main import create_app


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_root(client):
    resp = await client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "running"
    assert "uptime" in data


@pytest.mark.asyncio
async def test_api_root(client):
    resp = await client.get("/api")
    assert resp.status_code == 200
    data = resp.json()
    assert "endpoints" in data


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "time" in data
    assert "uptime" in data


@pytest.mark.asyncio
async def test_health_root(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_assess_risk(client):
    resp = await client.post(
        "/api/risk",
        json={"lat": 12.9716, "lng": 77.5946},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk"] in ("LOW", "MEDIUM", "HIGH")
    assert "reason" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_assess_risk_alias(client):
    resp = await client.post(
        "/api/assess-risk",
        json={"lat": 12.9716, "lng": 77.5946},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_assess_risk_with_time(client):
    resp = await client.post(
        "/api/risk",
        json={"lat": 12.9716, "lng": 77.5946, "time": "2025-01-01T23:30:00"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk"] in ("LOW", "MEDIUM", "HIGH")


@pytest.mark.asyncio
async def test_assess_risk_missing_fields(client):
    resp = await client.post("/api/risk", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_assess_risk_invalid_lat(client):
    resp = await client.post("/api/risk", json={"lat": 999, "lng": 77.59})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_heatmap(client):
    resp = await client.get("/api/heatmap")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 15
    for point in data:
        assert isinstance(point, list)
        assert len(point) == 3
        lat, lng, weight = point
        assert isinstance(lat, float)
        assert isinstance(lng, float)
        assert isinstance(weight, (int, float))
        assert 0 <= weight <= 1


@pytest.mark.asyncio
async def test_sos_alert(client):
    resp = await client.post(
        "/api/sos",
        json={"lat": 12.9716, "lng": 77.5946, "userId": "test-user"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["alertId"] > 0
    assert "timestamp" in data
    assert "Emergency" in data["message"]


@pytest.mark.asyncio
async def test_sos_alert_alias(client):
    resp = await client.post(
        "/api/sos-alert",
        json={"lat": 12.9716, "lng": 77.5946, "userId": "test-user"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_sos_alert_anonymous(client):
    resp = await client.post(
        "/api/sos",
        json={"lat": 12.9716, "lng": 77.5946},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_sos_alert_missing_location(client):
    resp = await client.post("/api/sos", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_chat_no_api_key(client):
    resp = await client.post(
        "/api/chat",
        json={"message": "Hello"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert "error" in data


@pytest.mark.asyncio
async def test_chat_empty_message(client):
    resp = await client.post(
        "/api/chat",
        json={"message": ""},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_chat_test(client):
    resp = await client.get("/api/chat/test")
    assert resp.status_code == 200
    data = resp.json()
    assert "apiKeyConfigured" in data
    assert "apiKeyPreview" in data


@pytest.mark.asyncio
async def test_chat_with_history(client):
    resp = await client.post(
        "/api/chat",
        json={
            "message": "What should I do?",
            "history": [
                {"role": "user", "text": "I'm feeling unsafe"},
                {"role": "assistant", "text": "Please call 112 immediately"},
            ],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "success" in data


@pytest.mark.asyncio
async def test_analyze_report_no_key(client):
    resp = await client.post(
        "/api/analyze-report",
        json={"text": "Something happened near the bus stop"},
    )
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_analyze_report_empty_text(client):
    resp = await client.post(
        "/api/analyze-report",
        json={"text": ""},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_reports_no_db(client):
    resp = await client.get("/api/reports")
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_404(client):
    resp = await client.get("/api/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cors_headers(client):
    resp = await client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"


@pytest.mark.asyncio
async def test_security_headers(client):
    resp = await client.get("/api/health")
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"


@pytest.mark.asyncio
async def test_rate_limit_response(client):
    responses = []
    for _ in range(3):
        resp = await client.get("/api/health")
        responses.append(resp.status_code)
    assert all(s == 200 for s in responses)
