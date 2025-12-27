import path from "node:path";

import dotenv from "dotenv";

dotenv.config();

export const MAX_CONCURRENT = Number.parseInt(
  process.env.MAX_CONCURRENT || "2",
  10,
);
export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
export const EVENTS_CHANNEL =
  process.env.REDIS_EVENTS_CHANNEL || "download-events";
export const CANCEL_PREFIX = "download-cancel:";
export const QUEUE_PAUSE_KEY = "download-queue:paused";
export const FOLDER_STATS_KEY = "download-folders";
export const WORKER_HEARTBEAT_KEY =
  process.env.WORKER_HEARTBEAT_KEY || "download-worker:heartbeat";
export const WORKER_HEARTBEAT_TTL = Number.parseInt(
  process.env.WORKER_HEARTBEAT_TTL || "15",
  10,
);
export const WORKER_HEARTBEAT_INTERVAL = Number.parseInt(
  process.env.WORKER_HEARTBEAT_INTERVAL || "5",
  10,
);
export const DOWNLOAD_REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.DOWNLOAD_REQUEST_TIMEOUT_MS || "60000",
  10,
);
export const FOLDER_STATS_INTERVAL_MS = Number.parseInt(
  process.env.FOLDER_STATS_INTERVAL_MS || "30000",
  10,
);
export const PUPPETEER_TIMEOUT = Number.parseInt(
  process.env.PUPPETEER_TIMEOUT || "45000",
  10,
);
export const PUPPETEER_HEADLESS = process.env.PUPPETEER_HEADLESS !== "false";
export const PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH;
export const DAILYUPLOADS_LOGIN_URL =
  process.env.DAILYUPLOADS_LOGIN_URL || "https://dailyuploads.net/login";
export const DAILYUPLOADS_USER = process.env.DAILYUPLOADS_USER;
export const DAILYUPLOADS_PASS = process.env.DAILYUPLOADS_PASS;
export const DAILYUPLOADS_COOKIE_PATH =
  process.env.DAILYUPLOADS_COOKIE_PATH ||
  path.join(__dirname, "..", ".session", "dailyuploads.json");
export const JELLYFIN_URL = process.env.JELLYFIN_URL || "http://localhost:8096";
export const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || "";
export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const downloadsDir = path.join(__dirname, "..", "downloads");
