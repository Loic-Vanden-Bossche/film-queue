import { NextResponse } from "next/server";

import { cancelKey, connection, EVENTS_CHANNEL, queue } from "@/app/lib/queue";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await params;
  if (!jobId) {
    return NextResponse.json(
      { message: "Job id is required" },
      { status: 400 },
    );
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    return NextResponse.json({ message: "Job not found" }, { status: 404 });
  }

  await connection.set(cancelKey(jobId), "1", "EX", 60 * 60);
  await connection.publish(
    EVENTS_CHANNEL,
    JSON.stringify({ type: "cancelled", jobId }),
  );

  return NextResponse.json({ status: "cancelled", id: jobId });
}
