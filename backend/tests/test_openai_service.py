import pytest
from app.services.openai_service import _parse_classification, VALID_CATEGORIES, VALID_SEVERITIES


def test_parse_valid_json():
    raw = '{"category": "crime", "severity": "high", "summary": "Test report"}'
    result = _parse_classification(raw)
    assert result["category"] == "crime"
    assert result["severity"] == "high"
    assert result["summary"] == "Test report"


def test_parse_with_code_block():
    raw = '```json\n{"category": "suspicious", "severity": "medium", "summary": "Suspicious activity"}\n```'
    result = _parse_classification(raw)
    assert result["category"] == "suspicious"
    assert result["severity"] == "medium"


def test_parse_with_code_block_no_lang():
    raw = '```\n{"category": "emergency", "severity": "high", "summary": "Emergency report"}\n```'
    result = _parse_classification(raw)
    assert result["category"] == "emergency"


def test_parse_invalid_category_defaults():
    raw = '{"category": "invalid", "severity": "low", "summary": "Test"}'
    result = _parse_classification(raw)
    assert result["category"] == "other"


def test_parse_invalid_severity_defaults():
    raw = '{"category": "crime", "severity": "critical", "summary": "Test"}'
    result = _parse_classification(raw)
    assert result["severity"] == "low"


def test_parse_missing_fields():
    raw = '{"category": "crime"}'
    with pytest.raises(ValueError, match="missing required fields"):
        _parse_classification(raw)


def test_parse_invalid_json():
    raw = "not json at all"
    with pytest.raises(Exception):
        _parse_classification(raw)


def test_valid_categories():
    expected = {"crime", "suspicious", "infrastructure", "emergency", "other"}
    assert VALID_CATEGORIES == expected


def test_valid_severities():
    expected = {"low", "medium", "high"}
    assert VALID_SEVERITIES == expected
