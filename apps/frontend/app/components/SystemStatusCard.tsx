import type { HealthStatus } from "@/app/lib/types";

type SystemStatusCardProps = {
  health: HealthStatus | null;
  isConnected: boolean;
  lastUpdated: number | null;
};

export default function SystemStatusCard({
  health,
  isConnected,
  lastUpdated,
}: SystemStatusCardProps) {
  return (
    <div className="rounded-2xl border border-white/50 bg-[color:var(--panel)] p-4 shadow-[0_18px_40px_-30px_rgba(26,23,18,0.8)] animate-[fade-up_0.7s_ease-out_both] [animation-delay:0.12s]">
      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
        System
      </p>
      <div className="mt-3 flex flex-col gap-2 text-sm font-medium">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[color:var(--muted)]">Worker</span>
          <span
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
              health?.worker === "ok"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {health?.worker ?? "unknown"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[color:var(--muted)]">Queue</span>
          <span
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
              health?.redis === "ok"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {health?.redis ?? "unknown"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[color:var(--muted)]">Events</span>
          <span
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
              isConnected
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isConnected ? "live" : "retry"}
          </span>
        </div>
        {health?.lastHeartbeatAgeMs !== null &&
          health?.lastHeartbeatAgeMs !== undefined && (
            <p className="text-xs text-[color:var(--muted)]">
              Last heartbeat {(health.lastHeartbeatAgeMs / 1000).toFixed(1)}s
              ago
            </p>
          )}
        {lastUpdated && (
          <p className="text-xs text-[color:var(--muted)]">
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
