import logging
from typing import Optional

from supabase import create_client, Client

from app.config.settings import get_settings

logger = logging.getLogger("avana.supabase")

_client: Optional[Client] = None


def get_supabase() -> Optional[Client]:
    global _client
    if _client is not None:
        return _client

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        logger.warning("Supabase not configured")
        return None

    try:
        _client = create_client(settings.supabase_url, settings.supabase_anon_key)
        logger.info("Supabase client initialized")
        return _client
    except Exception as exc:
        logger.error("Failed to initialize Supabase: %s", exc)
        return None


def _check(sb: Optional[Client]):
    if sb is None:
        raise RuntimeError("Supabase client not available")


async def insert_report(text: str, category: str, severity: str, summary: str) -> dict:
    sb = get_supabase()
    _check(sb)
    result = sb.table("reports").insert({
        "text": text, "category": category,
        "severity": severity, "summary": summary,
    }).execute()
    if result.error:
        logger.error("Supabase insert error: %s", result.error)
        raise RuntimeError(f"Database error: {result.error.message}")
    return result.data[0] if result.data else {}


async def fetch_reports(limit: int = 50) -> list[dict]:
    sb = get_supabase()
    _check(sb)
    result = (
        sb.table("reports")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    if result.error:
        logger.error("Supabase fetch error: %s", result.error)
        raise RuntimeError(f"Database error: {result.error.message}")
    return result.data or []


async def upsert_user_profile(profile: dict) -> dict:
    sb = get_supabase()
    _check(sb)
    result = sb.table("user_profiles").upsert(profile).select().execute()
    if result.error:
        raise RuntimeError(f"Profile error: {result.error.message}")
    return result.data[0] if result.data else {}


async def get_user_profile(user_id: str) -> Optional[dict]:
    sb = get_supabase()
    _check(sb)
    result = sb.table("user_profiles").select("*").eq("id", user_id).maybe_single().execute()
    if result.error:
        raise RuntimeError(f"Profile fetch error: {result.error.message}")
    return result.data


async def insert_sos_alert(alert: dict) -> dict:
    sb = get_supabase()
    _check(sb)
    result = sb.table("sos_alerts").insert(alert).select().execute()
    if result.error:
        raise RuntimeError(f"SOS insert error: {result.error.message}")
    return result.data[0] if result.data else {}


async def insert_safety_event(event: dict) -> dict:
    sb = get_supabase()
    _check(sb)
    result = sb.table("safety_events").insert(event).select().execute()
    if result.error:
        raise RuntimeError(f"Safety event error: {result.error.message}")
    return result.data[0] if result.data else {}


async def fetch_safety_events(limit: int = 100) -> list[dict]:
    sb = get_supabase()
    _check(sb)
    result = sb.table("safety_events").select("*").order("created_at", desc=True).limit(limit).execute()
    if result.error:
        raise RuntimeError(f"Safety events fetch error: {result.error.message}")
    return result.data or []


async def insert_community_report(report: dict) -> dict:
    sb = get_supabase()
    _check(sb)
    result = sb.table("community_reports").insert(report).select().execute()
    if result.error:
        raise RuntimeError(f"Community report error: {result.error.message}")
    return result.data[0] if result.data else {}


async def fetch_community_reports(limit: int = 50) -> list[dict]:
    sb = get_supabase()
    _check(sb)
    result = sb.table("community_reports").select("*").order("created_at", desc=True).limit(limit).execute()
    if result.error:
        raise RuntimeError(f"Community reports fetch error: {result.error.message}")
    return result.data or []


async def fetch_community_posts(limit: int = 50) -> list[dict]:
    sb = get_supabase()
    _check(sb)
    result = (
        sb.table("community_posts")
        .select("*, user_profiles!inner(id, name)")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    if result.error:
        raise RuntimeError(f"Community posts error: {result.error.message}")
    return result.data or []


async def insert_community_post(post: dict) -> dict:
    sb = get_supabase()
    _check(sb)
    result = sb.table("community_posts").insert(post).select().execute()
    if result.error:
        raise RuntimeError(f"Community post error: {result.error.message}")
    return result.data[0] if result.data else {}


async def insert_comment(comment: dict) -> dict:
    sb = get_supabase()
    _check(sb)
    result = sb.table("post_comments").insert(comment).select().execute()
    if result.error:
        raise RuntimeError(f"Comment error: {result.error.message}")
    return result.data[0] if result.data else {}


async def fetch_comments(post_id: str) -> list[dict]:
    sb = get_supabase()
    _check(sb)
    result = (
        sb.table("post_comments")
        .select("*, user_profiles!inner(id, name)")
        .eq("post_id", post_id)
        .order("created_at")
        .execute()
    )
    if result.error:
        raise RuntimeError(f"Comments fetch error: {result.error.message}")
    return result.data or []
