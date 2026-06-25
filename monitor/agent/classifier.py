"""Classify social posts via the local `claude` CLI (subprocess, no API key)."""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import time
from typing import Any

logger = logging.getLogger(__name__)

VALID_SITUATION_TYPES = frozenset(
    {"damage", "rescue", "evacuation", "infrastructure", "other"}
)

CLASSIFY_PROMPT = """
You are a classifier for a Venezuela earthquake relief map.

There was a magnitude 7.1–7.5 earthquake in Venezuela on June 24, 2026, near the coast, epicenter approximately at 10.89°N, -67.74°. It caused major damage in Caracas, La Guaira, Carabobo, Falcón, and surrounding states.

Given a social media post, determine:
1. Is this post about the Venezuela earthquake of June 24, 2026? (not Turkey, not other events)
2. Does it describe physical damage, rescue operations, evacuations, or infrastructure failure?

If YES to both, extract and return this JSON (and nothing else):
{{
  "relevant": true,
  "title": "<short summary in Spanish, max 80 chars>",
  "area_name": "<city or neighborhood, e.g. Altamira, Caracas or La Guaira>",
  "lat": <number>,
  "lng": <number>,
  "situation_type": "<one of: damage | rescue | evacuation | infrastructure | other>",
  "description": "<1-2 sentence excerpt or summary in Spanish>",
  "approved": true
}}

If NO, return only: {{"relevant": false}}

Coordinate reference for Venezuela:
- Caracas (general): 10.48, -66.90
- Altamira: 10.496, -66.853
- San Bernardino: 10.508, -66.904
- Petare: 10.488, -66.794
- La Guaira: 10.60, -66.93
- Valencia: 10.16, -68.00
- Maracaibo: 10.63, -71.64
- Morón / epicenter: 10.25, -68.28
- Los Teques: 10.34, -67.04
- Mérida: 8.59, -71.14
- Tucacas / Falcón coast: 10.79, -68.31
- Chacao: 10.496, -66.853
- Los Palos Grandes: 10.496, -66.853
- La Pastora: 10.502, -66.918
- Valle Abajo: 10.471, -66.895
- El Llanito: 10.488, -66.794
- Baruta / Las Minas: 10.432, -66.878
- Guatire: 10.47, -66.54

If location is unclear, use Caracas general coords and note "ubicación aproximada" in description.

Only set approved: true if you are confident this is real earthquake damage/rescue in Venezuela on June 24, 2026.

POST TO CLASSIFY:
Platform: {platform}
Source URL: {source_url}
Has video/media: {has_media}
Text: {text}
"""

_claude_checked = False
_claude_available = False
_claude_executable: str | None = None


def resolve_claude_executable() -> str | None:
    """Return path to claude binary; on Windows use claude.exe (not .cmd) for stdin."""
    global _claude_executable
    if _claude_executable:
        return _claude_executable

    import sys

    if sys.platform == "win32":
        npm = os.environ.get("APPDATA", "")
        if npm:
            exe = os.path.join(
                npm,
                "npm",
                "node_modules",
                "@anthropic-ai",
                "claude-code",
                "bin",
                "claude.exe",
            )
            if os.path.isfile(exe):
                _claude_executable = exe
                return exe

    which = shutil.which("claude")
    if which and os.path.isfile(which):
        _claude_executable = which
        return which

    return None


def _invoke_claude(prompt: str, *, timeout_seconds: int) -> subprocess.CompletedProcess[str]:
    """Run claude -p with prompt on stdin (reliable on Windows)."""
    claude = resolve_claude_executable()
    if not claude:
        raise FileNotFoundError("claude executable not found")

    proc = subprocess.Popen(
        [claude, "-p"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    try:
        stdout, stderr = proc.communicate(input=prompt, timeout=timeout_seconds)
    except subprocess.TimeoutExpired as exc:
        proc.kill()
        proc.communicate()
        raise exc

    return subprocess.CompletedProcess(
        args=[claude, "-p"],
        returncode=proc.returncode or 0,
        stdout=stdout or "",
        stderr=stderr or "",
    )


def ensure_claude_cli() -> bool:
    """Verify `claude` is available; print install instructions if missing."""
    global _claude_checked, _claude_available
    if _claude_checked:
        return _claude_available

    _claude_checked = True
    _claude_available = resolve_claude_executable() is not None
    if not _claude_available:
        logger.error(
            "claude CLI not found. Install it from https://claude.ai/download "
            "or via npm: npm install -g @anthropic-ai/claude-cli"
        )
    return _claude_available


def extract_json_object(text: str) -> dict[str, Any] | None:
    """Parse JSON from CLI output, tolerating markdown or extra prose."""
    text = text.strip()
    if not text:
        return None

    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    # Brace-balanced scan for first complete object
    start = text.find("{")
    while start != -1:
        depth = 0
        for i in range(start, len(text)):
            ch = text[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidate = text[start : i + 1]
                    try:
                        data = json.loads(candidate)
                        if isinstance(data, dict):
                            return data
                    except json.JSONDecodeError:
                        break
        start = text.find("{", start + 1)

    # Last resort: greedy regex
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            return None
    return None


def classify_post(post: dict, *, timeout_seconds: int = 30) -> dict | None:
    """
    Run claude CLI in print mode (-p) and return a submission payload, or None.
    """
    if not ensure_claude_cli():
        return None

    prompt = CLASSIFY_PROMPT.format(
        platform=post.get("platform", "unknown"),
        source_url=post.get("source_url", ""),
        has_media=post.get("video_url") is not None,
        text=(post.get("text") or "")[:800],
    )

    try:
        result = _invoke_claude(prompt, timeout_seconds=timeout_seconds)
    except subprocess.TimeoutExpired:
        logger.warning("Classifier timeout for %s", post.get("source_url"))
        return None
    except FileNotFoundError:
        ensure_claude_cli()
        return None

    raw = (result.stdout or "").strip()
    if result.returncode != 0 and not raw:
        stderr = (result.stderr or "").strip()
        logger.warning(
            "claude CLI error for %s (code %s): %s",
            post.get("source_url"),
            result.returncode,
            stderr[:300],
        )
        return None

    data = extract_json_object(raw)
    if not data:
        logger.debug("No JSON in classifier output for %s: %r", post.get("source_url"), raw[:200])
        return None

    if not data.get("relevant", False):
        return None

    situation_type = data.get("situation_type", "other")
    if situation_type not in VALID_SITUATION_TYPES:
        situation_type = "other"

    try:
        lat = float(data["lat"])
        lng = float(data["lng"])
    except (KeyError, TypeError, ValueError):
        logger.warning("Classifier returned invalid coordinates for %s", post.get("source_url"))
        return None

    title = str(data.get("title", "")).strip()
    area_name = str(data.get("area_name", "")).strip()
    if len(title) < 3 or len(area_name) < 2:
        logger.warning("Classifier returned incomplete fields for %s", post.get("source_url"))
        return None

    return {
        "lat": lat,
        "lng": lng,
        "area_name": area_name,
        "title": title[:200],
        "description": str(data.get("description") or "").strip() or None,
        "video_url": post.get("video_url") or post.get("source_url"),
        "source_url": post.get("source_url"),
        "situation_type": situation_type,
    }


def classify_post_with_delay(
    post: dict,
    *,
    sleep_seconds: float = 2.0,
    timeout_seconds: int = 30,
) -> dict | None:
    """Classify and sleep to avoid hammering the CLI."""
    classified = classify_post(post, timeout_seconds=timeout_seconds)
    time.sleep(sleep_seconds)
    return classified
