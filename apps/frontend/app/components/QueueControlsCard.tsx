type QueueControlsCardProps = {
  queuePaused: boolean;
  queueUpdating: boolean;
  onToggle: () => void;
};

export default function QueueControlsCard({
  queuePaused,
  queueUpdating,
  onToggle,
}: QueueControlsCardProps) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-[0_16px_35px_-30px_rgba(26,23,18,0.6)] transition-transform duration-300 hover:-translate-y-1">
      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
        Queue control
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-[color:var(--muted)]">
          {queuePaused ? "Paused" : "Running"}
        </p>
        <button
          type="button"
          onClick={onToggle}
          disabled={queueUpdating}
          className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${
            queuePaused
              ? "border-emerald-200 text-emerald-700 hover:border-emerald-400"
              : "border-amber-200 text-amber-800 hover:border-amber-400"
          } cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {queueUpdating ? "Updating..." : queuePaused ? "Resume" : "Pause"}
        </button>
      </div>
    </div>
  );
}
