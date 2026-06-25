"""SQLite deduplication store for seen and submitted source URLs."""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "seen_urls.db")


def init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS seen_urls (
                url TEXT PRIMARY KEY,
                first_seen TEXT NOT NULL,
                submitted INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.commit()


def is_seen(url: str) -> bool:
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT 1 FROM seen_urls WHERE url = ?",
            (url,),
        ).fetchone()
        return row is not None


def mark_seen(url: str) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO seen_urls (url, first_seen, submitted) VALUES (?, ?, 0)",
            (url, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()


def mark_submitted(url: str) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "UPDATE seen_urls SET submitted = 1 WHERE url = ?",
            (url,),
        )
        conn.commit()


def reset_unsubmitted(url_like: str | None = None) -> int:
    """Delete unseen submissions so posts can be re-classified (e.g. after a bug fix)."""
    with sqlite3.connect(DB_PATH) as conn:
        if url_like:
            cur = conn.execute(
                "DELETE FROM seen_urls WHERE submitted = 0 AND url LIKE ?",
                (url_like,),
            )
        else:
            cur = conn.execute("DELETE FROM seen_urls WHERE submitted = 0")
        conn.commit()
        return cur.rowcount
