# Film Queue

Monorepo with:
- **frontend** (Next.js dashboard)
- **worker** (Node/BullMQ downloader + Puppeteer for dailyuploads)
- **redis** (queue + events)

## Requirements

- Node.js 20+
- Yarn 4 (Corepack)
- Docker (for Redis and production images)

## Development

### 1) Install dependencies

```bash
corepack enable
yarn install
```

### 2) Start Redis

```bash
docker compose up -d redis
```

### 3) Configure worker env

```bash
cp apps/worker/.env.example apps/worker/.env
```

Set at least:

```
DAILYUPLOADS_USER=your_user
DAILYUPLOADS_PASS=your_pass
```

### 4) Run worker

```bash
yarn workspace film-queue-worker dev
```

### 5) Run frontend

```bash
yarn workspace film-queue-frontend dev
```

Open http://localhost:3000

## Production (Docker)

### Full stack (compose)

```bash
docker compose -f docker-compose.prod.yml up --build
```

### Frontend

```bash
docker build -f apps/frontend/Dockerfile -t film-queue-frontend .
docker run --rm -p 3000:3000 film-queue-frontend
```

### Worker

```bash
docker build -f apps/worker/Dockerfile -t film-queue-worker .
docker run --rm -p 4000:4000 --env-file apps/worker/.env film-queue-worker
```

## Worker configuration

Env vars (see `apps/worker/.env.example`):

- `REDIS_URL` (default: `redis://localhost:6379`)
- `REDIS_EVENTS_CHANNEL` (default: `download-events`)
- `MAX_CONCURRENT` (default: `2`)
- `DOWNLOAD_REQUEST_TIMEOUT_MS` (default: `60000`)
- `PUPPETEER_TIMEOUT` (default: `45000`)
- `PUPPETEER_HEADLESS` (default: `true`)
- `PUPPETEER_EXECUTABLE_PATH` (optional)
- `DAILYUPLOADS_USER` / `DAILYUPLOADS_PASS`
- `DAILYUPLOADS_LOGIN_URL` (default: `https://dailyuploads.net/login`)
- `DAILYUPLOADS_COOKIE_PATH` (default: `apps/worker/.session/dailyuploads.json`)
- `WORKER_HEARTBEAT_KEY` (default: `download-worker:heartbeat`)
- `WORKER_HEARTBEAT_TTL` (default: `15`)
- `WORKER_HEARTBEAT_INTERVAL` (default: `5`)

## Dailyuploads flow

The worker logs in with env credentials, stores cookies on disk, and refreshes them when expired. After login, it resolves a direct download URL and uses those cookies + headers to download the file.

## Health & queue endpoints

Frontend API:
- `GET /api/jobs` list jobs
- `POST /api/jobs` enqueue `{ url }`
- `DELETE /api/jobs/:id` cancel job
- `GET /api/events` server-sent events stream
- `GET /api/queue` queue pause status
- `POST /api/queue` `{ action: "pause" | "resume" }`
- `GET /api/health` redis + worker status

## Notes

- Puppeteer needs Chrome/Chromium libraries in production. The worker Dockerfile includes them.
- The worker container should be able to write to `apps/worker/.session` to persist cookies.
- Create subfolders inside `apps/worker/downloads` (or symlinks to other drives). These appear in the UI folder selector.
