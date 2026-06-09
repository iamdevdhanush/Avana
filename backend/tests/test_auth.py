import pytest
from app.auth.dependencies import get_current_user, require_user


@pytest.mark.asyncio
async def test_get_current_user_no_auth():
    result = await get_current_user(credentials=None)
    assert result is None


@pytest.mark.asyncio
async def test_require_user_no_auth():
    with pytest.raises(Exception) as exc:
        await require_user(user=None)
    assert "Authentication required" in str(exc.value)
