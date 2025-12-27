import pino from "pino";

const logger = pino({
  name: "film-queue-api",
});

export default logger;
