import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.config.settings import get_settings

logger = logging.getLogger("avana.auth")

security_scheme = HTTPBearer(auto_error=False)

_supabase_client: Optional[Client] = None


def _get_supabase_admin() -> Optional[Client]:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        return None
    _supabase_client = create_client(settings.supabase_url, settings.supabase_anon_key)
    return _supabase_client


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Optional[dict]:
    if credentials is None:
        return None
    try:
        sb = _get_supabase_admin()
        if sb is None:
            return None
        token = credentials.credentials
        user = sb.auth.get_user(token)
        if user and user.user:
            return {
                "id": user.user.id,
                "email": user.user.email,
                "aud": user.user.aud,
            }
        return None
    except Exception as exc:
        logger.debug("Auth check failed (non-critical): %s", exc)
        return None


async def require_user(
    user: Optional[dict] = Depends(get_current_user),
) -> dict:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
