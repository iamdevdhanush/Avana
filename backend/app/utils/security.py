import time
import logging
from collections import defaultdict
from typing import Callable
from fastapi import Request, Response

logger = logging.getLogger("avana.security")

_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_MAX: int = 60
RATE_LIMIT_WINDOW: int = 60


def check_rate_limit(request: Request) -> bool:
    client_ip = request.client.host if request.client else "unknown"
    key = f"{client_ip}:{request.url.path}"
    now = time.time()
    timestamps = _rate_limit_store[key]
    timestamps[:] = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(timestamps) >= RATE_LIMIT_MAX:
        logger.warning("Rate limit exceeded for %s", key)
        return False
    timestamps.append(now)
    return True


SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
}


def add_security_headers(response: Response) -> None:
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
