# Film Queue Worker

TypeScript worker that consumes a Redis-backed download queue.
The worker only processes downloads and emits events to Redis; the Next.js app renders the UI.

## Run

```bash
# from repo root
docker compose up -d redis
yarn workspace film-queue-worker start
```

## Config

Create `apps/worker/.env` from `apps/worker/.env.example` to inject env vars in dev mode.

- `MAX_CONCURRENT` (default: 1, enforced)
- `REDIS_URL` (default: redis://localhost:6379)
- `REDIS_EVENTS_CHANNEL` (default: download-events)
- `PUPPETEER_TIMEOUT` (default: 45000)
- `PUPPETEER_HEADLESS` (default: true)
- `PUPPETEER_EXECUTABLE_PATH` (optional system Chrome path)
- `DAILYUPLOADS_USER` (required for dailyuploads.net)
- `DAILYUPLOADS_PASS` (required for dailyuploads.net)
- `DAILYUPLOADS_LOGIN_URL` (default: https://dailyuploads.net/login)
- `DAILYUPLOADS_COOKIE_PATH` (default: apps/worker/.session/dailyuploads.json)
- `WORKER_HEARTBEAT_KEY` (default: download-worker:heartbeat)
- `WORKER_HEARTBEAT_TTL` (default: 15 seconds)
- `WORKER_HEARTBEAT_INTERVAL` (default: 5 seconds)
- `WORKER_HEARTBEAT_THRESHOLD` (default: 15 seconds, used by API health)
- `DOWNLOAD_REQUEST_TIMEOUT_MS` (default: 60000)
- `FOLDER_STATS_INTERVAL_MS` (default: 30000)
- `JELLYFIN_URL` (default: http://localhost:8096)
- `JELLYFIN_API_KEY` (required to trigger scans)

## dl-protect.link

The worker uses Puppeteer to resolve `dl-protect.link` URLs before downloading.

## dailyuploads.net

The worker logs into `dailyuploads.net` with `DAILYUPLOADS_USER`/`DAILYUPLOADS_PASS`,
stores cookies on disk, and refreshes them when they expire.

## Download folders

Create subfolders (or symlinks) inside `apps/worker/downloads`. These are exposed to the UI
and used as download targets.
