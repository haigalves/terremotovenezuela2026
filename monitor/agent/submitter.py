"""Submit classified entries to the relief map API."""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

DEFAULT_API_URL = "https://terremotovenezuela2026.vercel.app/api/videos"


def submit(entry: dict[str, Any], *, api_url: str = DEFAULT_API_URL) -> bool:
    """
    POST a verified situation to the public /api/videos endpoint.

    Note: the API stores submissions as pending (approved=false) until an admin
    approves them at /admin — even if the classifier marked them approved.
    """
    payload = {
        "lat": entry["lat"],
        "lng": entry["lng"],
        "area_name": entry["area_name"],
        "title": entry["title"],
        "description": entry.get("description"),
        "video_url": entry["video_url"],
        "source_url": entry.get("source_url"),
        "situation_type": entry.get("situation_type", "damage"),
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(api_url, json=payload)
    except httpx.HTTPError as exc:
        logger.error("Submit network error for %s: %s", entry.get("title"), exc)
        return False

    if response.status_code == 201:
        logger.info("Submitted HTTP 201: %s | %s", entry.get("title"), entry.get("area_name"))
        return True

    body = response.text[:500]
    logger.error(
        "Submit failed HTTP %s for %s: %s",
        response.status_code,
        entry.get("title"),
        body,
    )
    return False
