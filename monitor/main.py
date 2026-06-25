#!/usr/bin/env python3
"""
Venezuela earthquake monitoring daemon.

Every MONITOR_INTERVAL_SECONDS:
  1. Scrapes recent posts from configured X accounts and Telegram channels
  2. Deduplicates against SQLite state
  3. Classifies new posts via `claude -p` (local CLI)
  4. Submits relevant entries to terremotovenezuela2026 /api/videos
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path

from agent.classifier import classify_post_with_delay, ensure_claude_cli
from agent.submitter import submit
from scrapers.telegram import scrape_telegram
from scrapers.twitter import scrape_twitter_account_sync
from state.db import init_db, is_seen, mark_seen, mark_submitted

ROOT = Path(__file__).resolve().parent
LOG_DIR = ROOT / "logs"
LOG_FILE = LOG_DIR / "monitor.log"

INTERVAL_SECONDS = int(os.getenv("MONITOR_INTERVAL_SECONDS", "300"))
API_URL = os.getenv("API_URL", "https://terremotovenezuela2026.vercel.app/api/videos")
TWITTER_POST_LIMIT = int(os.getenv("TWITTER_POST_LIMIT", "20"))
CLASSIFIER_SLEEP_SECONDS = float(os.getenv("CLASSIFIER_SLEEP_SECONDS", "2"))
CLAUDE_TIMEOUT_SECONDS = int(os.getenv("CLAUDE_TIMEOUT_SECONDS", "90"))

TWITTER_ACCOUNTS = ["ElPitazoTV", "ReporteYa", "cazamosfakenews"]
TELEGRAM_CHANNELS = ["sucesosrcamachovzla"]


def load_dotenv(path: Path) -> None:
    """Minimal .env loader (no extra dependency)."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def setup_logging() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    formatter = logging.Formatter(
        "[%(asctime)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    stream_handler = logging.StreamHandler(sys.stdout)
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    stream_handler.setFormatter(formatter)
    root.addHandler(stream_handler)

    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=10 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)


def log(message: str) -> None:
    logging.info(message)


def scrape_all() -> list[dict]:
    posts: list[dict] = []

    for account in TWITTER_ACCOUNTS:
        try:
            posts.extend(
                scrape_twitter_account_sync(account, limit=TWITTER_POST_LIMIT)
            )
        except Exception as exc:
            log(f"ERROR scraping Twitter @{account}: {exc}")

    for channel in TELEGRAM_CHANNELS:
        try:
            posts.extend(scrape_telegram(channel, limit=TWITTER_POST_LIMIT))
        except Exception as exc:
            log(f"ERROR scraping Telegram @{channel}: {exc}")

    return posts


def run_cycle() -> None:
    all_posts = scrape_all()
    log(f"Fetched {len(all_posts)} raw posts")

    new_posts = [p for p in all_posts if p.get("source_url") and not is_seen(p["source_url"])]
    log(f"{len(new_posts)} new (unseen) posts")

    submitted = 0
    for post in new_posts:
        source_url = post["source_url"]
        # Mark before LLM so a crash does not re-process the same URL
        mark_seen(source_url)

        classified = classify_post_with_delay(
            post,
            sleep_seconds=CLASSIFIER_SLEEP_SECONDS,
            timeout_seconds=CLAUDE_TIMEOUT_SECONDS,
        )
        if classified is None:
            continue

        if submit(classified, api_url=API_URL):
            mark_submitted(source_url)
            log(f"OK Submitted: {classified['title']} | {classified['area_name']}")
            submitted += 1
        else:
            log(f"FAIL Failed to submit: {classified.get('title')}")

    log(f"Cycle complete. Submitted {submitted} new entries.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Venezuela earthquake monitor daemon")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single cycle and exit (for testing)",
    )
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    setup_logging()
    init_db()

    # Re-read env after .env load
    global INTERVAL_SECONDS, API_URL, TWITTER_POST_LIMIT
    global CLASSIFIER_SLEEP_SECONDS, CLAUDE_TIMEOUT_SECONDS
    INTERVAL_SECONDS = int(os.getenv("MONITOR_INTERVAL_SECONDS", str(INTERVAL_SECONDS)))
    API_URL = os.getenv("API_URL", API_URL)
    TWITTER_POST_LIMIT = int(os.getenv("TWITTER_POST_LIMIT", str(TWITTER_POST_LIMIT)))
    CLASSIFIER_SLEEP_SECONDS = float(
        os.getenv("CLASSIFIER_SLEEP_SECONDS", str(CLASSIFIER_SLEEP_SECONDS))
    )
    CLAUDE_TIMEOUT_SECONDS = int(
        os.getenv("CLAUDE_TIMEOUT_SECONDS", str(CLAUDE_TIMEOUT_SECONDS))
    )

    if not ensure_claude_cli():
        sys.exit(1)

    log("Venezuela earthquake monitor started")
    log(f"Interval: {INTERVAL_SECONDS}s | API: {API_URL}")

    if args.once:
        try:
            run_cycle()
        except Exception as exc:
            log(f"ERROR in cycle: {exc}")
            sys.exit(1)
        return

    while True:
        try:
            run_cycle()
        except Exception as exc:
            log(f"ERROR in cycle: {exc}")
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
