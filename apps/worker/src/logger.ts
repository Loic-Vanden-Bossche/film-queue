import pino from "pino";

const logger = pino({
  name: "film-queue-worker",
});

export default logger;
