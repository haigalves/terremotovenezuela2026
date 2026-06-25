"""Scrape public Telegram channel pages (t.me/s/...)."""

from __future__ import annotations

import logging
import re

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-VE,es;q=0.9,en;q=0.8",
}


def scrape_telegram(channel: str, limit: int = 20) -> list[dict]:
    """
    Fetch the public preview page for a Telegram channel and parse recent messages.

    Args:
        channel: Channel username without @ (e.g. sucesosrcamachovzla).
        limit: Maximum number of messages to return.
    """
    url = f"https://t.me/s/{channel}"
    posts: list[dict] = []

    try:
        with httpx.Client(timeout=30.0, follow_redirects=True, headers=DEFAULT_HEADERS) as client:
            response = client.get(url)
            response.raise_for_status()
            html = response.text
    except httpx.HTTPError as exc:
        logger.warning("Telegram fetch failed for %s: %s", channel, exc)
        return posts

    soup = BeautifulSoup(html, "html.parser")
    messages = soup.select(".tgme_widget_message")

    for message in reversed(messages[-limit:]):
        try:
            post = _parse_message(message, channel)
            if post:
                posts.append(post)
        except Exception as exc:
            logger.debug("Skipping telegram message parse error: %s", exc)

    logger.info("Telegram @%s: parsed %d messages", channel, len(posts))
    return posts


def _parse_message(message, channel: str) -> dict | None:
    text_el = message.select_one(".tgme_widget_message_text")
    text = text_el.get_text("\n", strip=True) if text_el else ""
    if not text:
        # Some posts are media-only; use caption from photo/video wrapper if present
        text = message.get_text("\n", strip=True)[:600]

    message_id = _extract_message_id(message, channel)
    if not message_id:
        return None

    source_url = f"https://t.me/{channel}/{message_id}"

    time_el = message.select_one("time[datetime]")
    timestamp = time_el["datetime"] if time_el and time_el.has_attr("datetime") else None

    has_video = message.select_one("video") is not None
    # Telegram preview pages often use video wraps without direct file URLs
    if not has_video:
        has_video = bool(message.select_one(".tgme_widget_message_video_wrap"))

    video_url = source_url if has_video else None

    return {
        "source_url": source_url,
        "text": text[:600],
        "video_url": video_url,
        "timestamp": timestamp,
        "platform": "telegram",
    }


def _extract_message_id(message, channel: str) -> str | None:
    wrap = message.find_parent(class_="tgme_widget_message_wrap")
    if wrap and wrap.has_attr("data-post"):
        data_post = wrap["data-post"]
        # format: channelname/12345
        if "/" in data_post:
            return data_post.split("/", 1)[1]

    link = message.select_one(f'a[href*="/{channel}/"]')
    if link and link.has_attr("href"):
        match = re.search(rf"/{re.escape(channel)}/(\d+)", link["href"])
        if match:
            return match.group(1)

    # Fallback: data-post on the message itself
    if message.has_attr("data-post"):
        data_post = message["data-post"]
        if "/" in data_post:
            return data_post.split("/", 1)[1]

    return None
