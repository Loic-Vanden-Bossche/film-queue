import { formatBytes, formatDuration } from "@/app/lib/format";
import { STATUS_LABELS, STATUS_STYLES } from "@/app/lib/status";
import type { Job } from "@/app/lib/types";

type JobCardProps = {
  job: Job;
  index: number;
  compactView: boolean;
  isRefreshing: boolean;
  isCancelling: boolean;
  clock: number;
  onCancel: (jobId: string) => void;
};

export default function JobCard({
  job,
  index,
  compactView,
  isRefreshing,
  isCancelling,
  clock,
  onCancel,
}: JobCardProps) {
  const totalBytes = job.totalBytes;
  const remainingBytes =
    totalBytes !== null ? Math.max(totalBytes - job.bytes, 0) : null;
  const percent =
    totalBytes && totalBytes > 0
      ? Math.min((job.bytes / totalBytes) * 100, 100)
      : job.status === "completed"
        ? 100
        : null;
  const elapsedSeconds =
    job.startedAt !== null ? Math.max((clock - job.startedAt) / 1000, 1) : null;
  const rate = elapsedSeconds !== null ? job.bytes / elapsedSeconds : null;
  const eta =
    job.status === "active" &&
    job.startedAt &&
    job.bytes > 0 &&
    totalBytes &&
    remainingBytes
      ? formatDuration(remainingBytes / (rate || 1))
      : "--";

  const isCancelled = job.status === "cancelled";

  return (
    <div
      className={`grid gap-4 rounded-2xl border border-amber-100/60 bg-white px-4 py-4 text-sm shadow-[0_14px_30px_-24px_rgba(26,23,18,0.6)] transition-transform duration-300 hover:-translate-y-1 md:grid-cols-[160px_minmax(0,1fr)_200px] animate-[fade-up_0.6s_ease-out_both] ${
        isCancelled ? "opacity-60" : ""
      }`}
      style={{ animationDelay: `${0.12 + index * 0.04}s` }}
    >
      <div className="flex flex-col gap-2">
        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
            STATUS_STYLES[job.status] ||
            "border-slate-200 bg-slate-100 text-slate-700"
          }`}
        >
          {STATUS_LABELS[job.status] || job.status}
        </span>
        <span className="text-xs text-[color:var(--muted)]">
          {job.startedAt
            ? `Started ${new Date(job.startedAt).toLocaleTimeString()}`
            : "Waiting for worker"}
        </span>
        <span className="text-xs text-[color:var(--muted)]">ETA {eta}</span>
        {job.status === "active" && (
          <button
            type="button"
            onClick={() => onCancel(job.id)}
            disabled={isCancelling}
            className="w-fit rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCancelling ? "Cancelling..." : "Cancel"}
          </button>
        )}
      </div>
      <div className={`space-y-3 ${compactView ? "md:col-span-2" : ""}`}>
        <a
          href={job.url}
          rel="external nofollow"
          target="_blank"
          className="break-all font-medium text-[color:var(--ink)] underline decoration-transparent transition hover:decoration-[color:var(--accent)]"
        >
          {job.url}
        </a>
        {!compactView && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
              <span>
                {formatBytes(job.bytes)} /{" "}
                {totalBytes ? formatBytes(totalBytes) : "Unknown"}
              </span>
              <span>
                Remaining{" "}
                {remainingBytes !== null
                  ? formatBytes(remainingBytes)
                  : "Unknown"}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-amber-100">
              <div
                className={`h-full bg-[linear-gradient(90deg,var(--accent-strong),#f6c26d,var(--accent-strong))] bg-[length:200%_200%] transition-[width] duration-700 motion-safe:animate-[progress-shimmer_2.2s_linear_infinite] ${
                  isCancelled ? "bg-slate-300" : ""
                } ${percent === null ? "opacity-40" : ""}`}
                style={{ width: `${percent ?? 0}%` }}
              />
            </div>
          </div>
        )}
        {job.filename && (
          <p className="text-xs text-[color:var(--muted)]">
            File: {job.filename}
          </p>
        )}
        {job.folder && (
          <p className="text-xs text-[color:var(--muted)]">
            Folder: {job.folder}
          </p>
        )}
        {job.error && <p className="text-xs text-rose-600">{job.error}</p>}
      </div>
      {!compactView && (
        <div className="flex flex-col items-start justify-between gap-2 md:items-end">
          <p className="text-lg font-semibold text-[color:var(--ink)]">
            {percent !== null ? `${percent.toFixed(1)}%` : "0%"}
          </p>
          <p className="text-xs text-[color:var(--muted)]">
            {job.finishedAt
              ? `Done ${new Date(job.finishedAt).toLocaleTimeString()}`
              : isRefreshing
                ? "Syncing..."
                : "In progress"}
          </p>
        </div>
      )}
    </div>
  );
}
