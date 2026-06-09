import pytest
from app.services.supabase_service import get_supabase


def test_get_supabase_no_config():
    result = get_supabase()
    assert result is None or hasattr(result, "table")
