export type Job = {
  id: string;
  url: string;
  folder: string | null;
  status: string;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  bytes: number;
  totalBytes: number | null;
  filename: string | null;
  error: string | null;
};

export type HealthStatus = {
  redis: "ok" | "down";
  worker: "ok" | "stale" | "unknown";
  queuePaused: boolean;
  lastHeartbeatAgeMs: number | null;
};

export type FolderStat = {
  name: string;
  path: string;
  sizeBytes: number;
  freeBytes: number;
  totalBytes: number;
  updatedAt: number;
};
