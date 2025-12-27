import IORedis from "ioredis";

import { REDIS_URL } from "./config";

export const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});
export const publisher = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
