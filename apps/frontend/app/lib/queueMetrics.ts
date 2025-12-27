import { formatDuration } from "@/app/lib/format";
import type { Job } from "@/app/lib/types";

type QueueStats = {
  total: number;
  active: number;
  queued: number;
  completed: number;
  failed: number;
  bytes: number;
  knownBytes: number;
  totalBytes: number;
  remainingBytes: number;
  rate: number;
};

export function computeQueueStats(jobs: Job[], clock: number): QueueStats {
  const base: QueueStats = {
    total: 0,
    active: 0,
    queued: 0,
    completed: 0,
    failed: 0,
    bytes: 0,
    knownBytes: 0,
    totalBytes: 0,
    remainingBytes: 0,
    rate: 0,
  };

  return jobs.reduce((acc, job) => {
    acc.total += 1;
    if (job.status === "active") acc.active += 1;
    if (job.status === "waiting" || job.status === "delayed") {
      acc.queued += 1;
    }
    if (job.status === "completed") acc.completed += 1;
    if (job.status === "failed") acc.failed += 1;
    if (
      job.status === "active" ||
      job.status === "waiting" ||
      job.status === "delayed"
    ) {
      acc.bytes += job.bytes || 0;
      if (job.totalBytes) {
        acc.knownBytes += job.bytes || 0;
        acc.totalBytes += job.totalBytes;
        acc.remainingBytes += Math.max(job.totalBytes - job.bytes, 0);
      }
      if (job.status === "active" && job.startedAt && job.bytes > 0) {
        const elapsed = Math.max((clock - job.startedAt) / 1000, 1);
        acc.rate += job.bytes / elapsed;
      }
    }
    return acc;
  }, base);
}

export function getOverallPercent(stats: QueueStats) {
  if (stats.totalBytes <= 0) return null;
  return Math.min((stats.knownBytes / stats.totalBytes) * 100, 100);
}

export function getOverallEta(stats: QueueStats) {
  if (stats.rate <= 0 || stats.remainingBytes <= 0) return "--";
  return formatDuration(stats.remainingBytes / stats.rate);
}
