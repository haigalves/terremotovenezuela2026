# Venezuela Earthquake Monitor

Local Python daemon that watches Venezuelan news sources for **June 24, 2026 earthquake** posts, classifies them with the **`claude` CLI** (no Anthropic API key), and submits relevant videos to [terremotovenezuela2026](https://terremotovenezuela2026.vercel.app).

## What it does

Every **5 minutes** (configurable):

1. Scrapes ~20 recent posts from:
   - https://x.com/ElPitazoTV
   - https://x.com/ReporteYa
   - https://x.com/cazamosfakenews
   - https://t.me/s/sucesosrcamachovzla
2. Skips URLs already in `state/seen_urls.db`
3. Sends each new post to `claude -p` for earthquake relevance + geo extraction
4. POSTs relevant items to `https://terremotovenezuela2026.vercel.app/api/videos`

Submissions appear on the map **after admin approval** at `/admin` (public API inserts `approved=false`).

## Prerequisites

- **Python 3.11+**
- **`claude` CLI** installed and authenticated:
  ```bash
  claude --version
  ```
  Install: https://claude.ai/download or `npm install -g @anthropic-ai/claude-cli`
- **Chromium** for Playwright (Twitter scraper)

## Install

```bash
cd venezuela-monitor
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
playwright install chromium
```

Copy optional settings:

```bash
cp .env.example .env
```

## Run

Foreground:

```bash
python main.py
```

One-shot test (run a single cycle then exit) — useful for debugging:

```bash
python main.py --once
```

### Background daemon

**Linux / macOS:**

```bash
nohup python main.py >> logs/monitor.log 2>&1 &
```

**Windows (PowerShell):**

```powershell
Start-Process python -ArgumentList "main.py" -WindowStyle Hidden -RedirectStandardOutput logs\monitor.log -RedirectStandardError logs\monitor.err.log
```

### Stop

```bash
# Linux / macOS
pkill -f "python main.py"

# Windows
Get-Process python | Where-Object { $_.Path -like "*venezuela-monitor*" } | Stop-Process
```

### Logs

```bash
tail -f logs/monitor.log
```

## Configuration (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `MONITOR_INTERVAL_SECONDS` | `300` | Seconds between scrape cycles |
| `API_URL` | `.../api/videos` | Relief map submission endpoint |
| `TWITTER_POST_LIMIT` | `20` | Max posts per source per cycle |
| `CLASSIFIER_SLEEP_SECONDS` | `2` | Pause between `claude` calls |
| `CLAUDE_TIMEOUT_SECONDS` | `30` | Subprocess timeout per classification |

## Project layout

```
venezuela-monitor/
├── main.py              # Daemon loop
├── scrapers/
│   ├── telegram.py      # t.me/s/ HTML parser
│   └── twitter.py       # Playwright X scraper
├── agent/
│   ├── classifier.py    # claude CLI subprocess
│   └── submitter.py     # POST to relief map API
├── state/
│   └── seen_urls.db     # SQLite dedup (created at runtime)
└── logs/
    └── monitor.log
```

## Notes

- **X login walls:** If X shows a login page, that account is skipped for the cycle (logged as a warning).
- **Telegram videos:** Direct MP4 URLs are often unavailable; the channel post URL is used as `video_url`.
- **Dedup:** URLs are marked seen *before* calling Claude so restarts do not double-classify.
- **Rate limits:** 2s sleep between Claude calls by default.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `claude CLI not found` | Install CLI and ensure `claude` is on your PATH |
| Twitter always skipped | X may block headless browsers; try running on a machine with network access to x.com |
| HTTP 400 on submit | Classifier returned invalid coords/fields; check `logs/monitor.log` |
| Playwright error | Run `playwright install chromium` |
