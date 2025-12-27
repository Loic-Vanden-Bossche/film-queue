import fs from "node:fs";

import { downloadsDir } from "./config";
import { publishEvent } from "./events";
import { startHeartbeat } from "./heartbeat";
import logger from "./logger";
import { startWorker } from "./worker";

fs.mkdirSync(downloadsDir, { recursive: true });

const worker = startWorker();

worker.on("failed", (job, error) => {
  if (!job) return;
  publishEvent({
    type: "failed",
    jobId: job.id,
    url: job.data.url,
    error: error.message,
  }).catch(() => undefined);
  logger.error({ jobId: job.id, url: job.data.url, err: error }, "Job failed");
});

logger.info("Worker started. Listening for jobs in Redis.");
startHeartbeat();
