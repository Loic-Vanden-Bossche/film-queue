import { NextResponse } from "next/server";

import logger from "@/app/lib/logger";
import {
  cancelKey,
  connection,
  FOLDER_STATS_KEY,
  queue,
} from "@/app/lib/queue";

export const runtime = "nodejs";

function parseJsonPayload<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value as T;
  return null;
}

export async function GET() {
  const jobs = await queue.getJobs([
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
  ]);

  const cancelKeys = jobs.map((job) => cancelKey(String(job.id)));
  const cancelFlags = cancelKeys.length
    ? await connection.mget(cancelKeys)
    : [];

  const payload = await Promise.all(
    jobs.map(async (job, index) => {
      const state = await job.getState();
      const progressValue = parseJsonPayload<{
        bytes?: number;
        totalBytes?: number | null;
      }>(job.progress);
      const progress =
        typeof job.progress === "number"
          ? { bytes: job.progress, totalBytes: null }
          : progressValue || { bytes: 0, totalBytes: null };
      const returnValue = parseJsonPayload<{
        filename?: string;
        bytes?: number;
        totalBytes?: number | null;
      }>(job.returnvalue);

      const cancelled =
        cancelFlags[index] === "1" || job.failedReason === "Cancelled";

      return {
        id: job.id,
        url: job.data.url,
        folder: job.data.folder ?? null,
        status: cancelled ? "cancelled" : state,
        createdAt: job.timestamp,
        startedAt: job.processedOn,
        finishedAt: job.finishedOn,
        bytes: returnValue?.bytes ?? progress.bytes ?? 0,
        totalBytes: returnValue?.totalBytes ?? progress.totalBytes ?? null,
        filename: returnValue?.filename ?? null,
        error: job.failedReason || null,
      };
    }),
  );

  payload.sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const url = String(data?.url || "").trim();
    const folder = String(data?.folder || "").trim();
    if (!url) {
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }
    if (!folder) {
      return NextResponse.json(
        { message: "Folder is required" },
        { status: 400 },
      );
    }

    const rawFolders = await connection.get(FOLDER_STATS_KEY);
    const folderList = rawFolders
      ? (JSON.parse(rawFolders) as Array<{ name: string }>)
      : [];
    const folderExists = folderList.some((entry) => entry.name === folder);
    if (!folderExists) {
      return NextResponse.json({ message: "Unknown folder" }, { status: 400 });
    }

    try {
      const job = await queue.add("download", { url, folder });
      logger.info({ jobId: job.id, url }, "Download queued");
      return NextResponse.json(
        { id: job.id, url, folder, status: "waiting" },
        { status: 201 },
      );
    } catch (error) {
      console.error("Failed to queue download", error);
      return NextResponse.json(
        { message: "Queue service unavailable" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Invalid queue request", error);
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
