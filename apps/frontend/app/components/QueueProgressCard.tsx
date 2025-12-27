import { formatBytes, formatRate } from "@/app/lib/format";

type QueueProgressCardProps = {
  overallPercent: number | null;
  knownBytes: number;
  totalBytes: number;
  remainingBytes: number;
  overallEta: string;
  rate: number;
};

export default function QueueProgressCard({
  overallPercent,
  knownBytes,
  totalBytes,
  remainingBytes,
  overallEta,
  rate,
}: QueueProgressCardProps) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-[0_16px_35px_-30px_rgba(26,23,18,0.6)] transition-transform duration-300 hover:-translate-y-1">
      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
        Queue progress
      </p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
        {overallPercent !== null ? `${overallPercent.toFixed(1)}%` : "--"}
      </p>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-amber-100">
        <div
          className={`h-full bg-[linear-gradient(90deg,var(--accent),#f7b06e,var(--accent))] bg-[length:200%_200%] transition-[width] duration-700 motion-safe:animate-[progress-shimmer_2.2s_linear_infinite] ${
            overallPercent === null ? "opacity-40" : ""
          }`}
          style={{ width: `${overallPercent ?? 0}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--muted)]">
        <span>
          {formatBytes(knownBytes)} /{" "}
          {totalBytes ? formatBytes(totalBytes) : "Unknown"}
        </span>
        <span>
          Remaining {totalBytes ? formatBytes(remainingBytes) : "Unknown"} · ETA{" "}
          {overallEta}
        </span>
        <span>Bandwidth {formatRate(rate)}</span>
      </div>
    </div>
  );
}
