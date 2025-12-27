import IORedis from "ioredis";

import logger from "@/app/lib/logger";
import { EVENTS_CHANNEL, REDIS_URL } from "@/app/lib/queue";

export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const subscriber = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

      const send = (payload: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          isClosed = true;
        }
      };

      const handleMessage = (_channel: string, message: string) => {
        try {
          const parsed = JSON.parse(message) as {
            type?: string;
            jobId?: string;
            url?: string;
            bytes?: number;
            totalBytes?: number | null;
            filename?: string;
          };
          if (parsed.type === "completed") {
            logger.info(
              {
                jobId: parsed.jobId,
                url: parsed.url,
                bytes: parsed.bytes,
                totalBytes: parsed.totalBytes,
                filename: parsed.filename,
              },
              "Download completed",
            );
          }
        } catch {
          // Ignore non-JSON payloads.
        }
        send(message);
      };

      const keepAlive = setInterval(() => {
        send(JSON.stringify({ type: "ping" }));
      }, 15000);

      subscriber.subscribe(EVENTS_CHANNEL).catch(() => undefined);
      subscriber.on("message", handleMessage);

      cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(keepAlive);
        subscriber.off("message", handleMessage);
        subscriber.unsubscribe(EVENTS_CHANNEL).catch(() => undefined);
        subscriber.quit().catch(() => undefined);
        try {
          controller.close();
        } catch {
          // Ignore double-close errors.
        }
      };

      controller.enqueue(encoder.encode("retry: 2000\n\n"));
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
