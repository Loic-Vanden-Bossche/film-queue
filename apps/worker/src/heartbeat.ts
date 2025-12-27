import {
  WORKER_HEARTBEAT_INTERVAL,
  WORKER_HEARTBEAT_KEY,
  WORKER_HEARTBEAT_TTL,
} from "./config";
import logger from "./logger";
import { connection } from "./redis";

export function startHeartbeat() {
  setInterval(() => {
    connection
      .set(WORKER_HEARTBEAT_KEY, String(Date.now()), "EX", WORKER_HEARTBEAT_TTL)
      .catch((error) => {
        logger.warn({ err: error }, "Failed to update worker heartbeat");
      });
  }, WORKER_HEARTBEAT_INTERVAL * 1000);
}
