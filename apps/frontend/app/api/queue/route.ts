import { NextResponse } from "next/server";

import logger from "@/app/lib/logger";
import { connection, queue, QUEUE_PAUSE_KEY } from "@/app/lib/queue";

export const runtime = "nodejs";

export async function GET() {
  const paused = (await connection.get(QUEUE_PAUSE_KEY)) === "1";
  return NextResponse.json({ paused });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const action = String(data?.action || "").toLowerCase();

    if (action === "pause") {
      await queue.pause();
      await connection.set(QUEUE_PAUSE_KEY, "1");
      logger.info("Queue paused");
      return NextResponse.json({ paused: true });
    }

    if (action === "resume") {
      await queue.resume();
      await connection.del(QUEUE_PAUSE_KEY);
      logger.info("Queue resumed");
      return NextResponse.json({ paused: false });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error({ err: error }, "Failed to update queue status");
    return NextResponse.json(
      { message: "Queue service unavailable" },
      { status: 500 },
    );
  }
}
