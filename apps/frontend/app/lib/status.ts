export const STATUS_STYLES: Record<string, string> = {
  waiting: "border-amber-200 bg-amber-100 text-amber-800",
  active: "border-sky-200 bg-sky-100 text-sky-800",
  completed: "border-emerald-200 bg-emerald-100 text-emerald-800",
  failed: "border-rose-200 bg-rose-100 text-rose-800",
  delayed: "border-violet-200 bg-violet-100 text-violet-800",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

export const STATUS_LABELS: Record<string, string> = {
  waiting: "Queued",
  active: "Downloading",
  completed: "Completed",
  failed: "Failed",
  delayed: "Delayed",
  cancelled: "Cancelled",
};
