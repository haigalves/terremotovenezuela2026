"""Scrape recent posts from public X/Twitter profiles using Playwright."""

from __future__ import annotations

import asyncio
import logging
import re

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)

STATUS_PATH_RE = re.compile(r"^/([^/]+)/status/(\d+)")


async def scrape_twitter_account(account: str, limit: int = 20) -> list[dict]:
    """Scrape up to `limit` recent posts from a public X profile."""
    posts: list[dict] = []

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=USER_AGENT,
            locale="es-VE",
            viewport={"width": 1280, "height": 900},
        )
        page = await context.new_page()

        try:
            profile_url = f"https://x.com/{account}"
            await page.goto(profile_url, wait_until="domcontentloaded", timeout=45_000)
            await page.wait_for_timeout(2_000)

            current_url = page.url.lower()
            if "/login" in current_url or "/i/flow/login" in current_url:
                logger.warning(
                    "Login wall detected for @%s (redirected to %s) — skipping",
                    account,
                    page.url,
                )
                return posts

            # Login modal or interstitial without redirect
            login_modal = await page.query_selector('input[autocomplete="username"]')
            if login_modal:
                logger.warning("Login wall detected for @%s — skipping", account)
                return posts

            try:
                await page.wait_for_selector("article", timeout=8_000)
            except PlaywrightTimeoutError:
                logger.warning(
                    "Login wall or empty timeline for @%s — no articles found — skipping",
                    account,
                )
                return posts

            articles = await page.query_selector_all("article")
            seen_status_urls: set[str] = set()

            for article in articles:
                if len(posts) >= limit:
                    break
                try:
                    post = await _parse_article(article, account)
                    if not post:
                        continue
                    if post["source_url"] in seen_status_urls:
                        continue
                    seen_status_urls.add(post["source_url"])
                    posts.append(post)
                except Exception as exc:
                    logger.debug("Skipping article parse error @%s: %s", account, exc)

        except Exception as exc:
            logger.warning("Twitter scrape failed for @%s: %s", account, exc)
        finally:
            await context.close()
            await browser.close()

    logger.info("Twitter @%s: parsed %d posts", account, len(posts))
    return posts


async def _parse_article(article, account: str) -> dict | None:
    source_url = await _extract_status_url(article, account)
    if not source_url:
        return None

    text = (await article.inner_text()) or ""
    text = " ".join(text.split())
    text = text[:600]

    time_el = await article.query_selector("time[datetime]")
    timestamp = await time_el.get_attribute("datetime") if time_el else None

    video_el = await article.query_selector("video")
    video_url = source_url if video_el else None

    return {
        "source_url": source_url,
        "text": text,
        "video_url": video_url,
        "timestamp": timestamp,
        "platform": "twitter",
    }


async def _extract_status_url(article, account: str) -> str | None:
    links = await article.query_selector_all('a[href*="/status/"]')
    for link in links:
        href = await link.get_attribute("href")
        if not href:
            continue
        normalized = _normalize_status_url(href, account)
        if normalized:
            return normalized
    return None


def _normalize_status_url(href: str, account: str) -> str | None:
    if href.startswith("/"):
        path = href
    else:
        from urllib.parse import urlparse

        parsed = urlparse(href)
        path = parsed.path

    match = STATUS_PATH_RE.match(path.split("?")[0])
    if not match:
        return None

    handle, status_id = match.group(1), match.group(2)
    # Prefer the profile we're scraping but accept any status link in the article
    return f"https://x.com/{handle}/status/{status_id}"


def scrape_twitter_account_sync(account: str, limit: int = 20) -> list[dict]:
    """Synchronous wrapper for use from the main monitoring loop."""
    return asyncio.run(scrape_twitter_account(account, limit=limit))
