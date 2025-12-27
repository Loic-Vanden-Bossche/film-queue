import { NextResponse } from "next/server";

import logger from "@/app/lib/logger";
import { connection, QUEUE_PAUSE_KEY } from "@/app/lib/queue";

export const runtime = "nodejs";

const WORKER_HEARTBEAT_KEY =
  process.env.WORKER_HEARTBEAT_KEY || "download-worker:heartbeat";
const WORKER_HEARTBEAT_THRESHOLD = Number.parseInt(
  process.env.WORKER_HEARTBEAT_THRESHOLD || "15000",
  10,
);

export async function GET() {
  try {
    const [ping, heartbeat, paused] = await Promise.all([
      connection.ping(),
      connection.get(WORKER_HEARTBEAT_KEY),
      connection.get(QUEUE_PAUSE_KEY),
    ]);

    const heartbeatAt = heartbeat ? Number.parseInt(heartbeat, 10) : null;
    const ageMs = heartbeatAt ? Date.now() - heartbeatAt : null;
    const workerOk =
      heartbeatAt !== null &&
      ageMs !== null &&
      ageMs < WORKER_HEARTBEAT_THRESHOLD;

    return NextResponse.json({
      redis: ping === "PONG" ? "ok" : "down",
      worker: workerOk ? "ok" : "stale",
      lastHeartbeatAt: heartbeatAt,
      lastHeartbeatAgeMs: ageMs,
      queuePaused: paused === "1",
    });
  } catch (error) {
    logger.error({ err: error }, "Health check failed");
    return NextResponse.json(
      {
        redis: "down",
        worker: "unknown",
        queuePaused: false,
        lastHeartbeatAt: null,
        lastHeartbeatAgeMs: null,
      },
      { status: 500 },
    );
  }
}
