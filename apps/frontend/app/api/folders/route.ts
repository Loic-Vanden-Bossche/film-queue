import { NextResponse } from "next/server";

import logger from "@/app/lib/logger";
import { connection, FOLDER_STATS_KEY } from "@/app/lib/queue";

export const runtime = "nodejs";

export async function GET() {
  try {
    const raw = await connection.get(FOLDER_STATS_KEY);
    if (!raw) {
      return NextResponse.json([]);
    }
    const parsed = JSON.parse(raw) as Array<{
      name: string;
      path: string;
      sizeBytes: number;
      freeBytes: number;
      totalBytes: number;
      updatedAt: number;
    }>;
    return NextResponse.json(parsed);
  } catch (error) {
    logger.error({ err: error }, "Failed to read folder stats");
    return NextResponse.json([], { status: 500 });
  }
}
