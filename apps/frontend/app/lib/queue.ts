import { Queue } from "bullmq";
import IORedis from "ioredis";

export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
export const EVENTS_CHANNEL =
  process.env.REDIS_EVENTS_CHANNEL || "download-events";
export const QUEUE_NAME = "download-queue";
export const CANCEL_PREFIX = "download-cancel:";
export const QUEUE_PAUSE_KEY = "download-queue:paused";
export const FOLDER_STATS_KEY = "download-folders";

export function cancelKey(jobId: string) {
  return `${CANCEL_PREFIX}${jobId}`;
}

export const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});
export const queue = new Queue(QUEUE_NAME, { connection });
