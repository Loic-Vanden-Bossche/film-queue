import type { FormEventHandler } from "react";

import FolderSelect from "@/app/components/FolderSelect";
import { formatBytes } from "@/app/lib/format";
import type { FolderStat } from "@/app/lib/types";

type QueueFormProps = {
  onSubmit: FormEventHandler<HTMLFormElement>;
  isSubmitting: boolean;
  queuePaused: boolean;
  hasFolders: boolean;
  folders: FolderStat[];
  selectedFolder: string;
  onFolderChange: (folderName: string) => void;
  selectedFolderStats: FolderStat | null;
  errorMessage: string | null;
  statsSummary: {
    active: number;
    queued: number;
    completed: number;
  };
};

export default function QueueForm({
  onSubmit,
  isSubmitting,
  queuePaused,
  hasFolders,
  folders,
  selectedFolder,
  onFolderChange,
  selectedFolderStats,
  errorMessage,
  statsSummary,
}: QueueFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-3xl border border-white/60 bg-[color:var(--panel)] p-5 shadow-[0_20px_50px_-40px_rgba(26,23,18,0.8)] transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Queue a new download</h2>
        <p className="text-sm text-[color:var(--muted)]">
          Paste a direct file URL. The worker handles redirects and retries.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px_auto]">
        <input
          name="url"
          type="url"
          required
          placeholder="https://example.com/film-cut.mov"
          className="w-full rounded-2xl border border-amber-100 bg-white px-4 py-3 text-base shadow-inner outline-none transition focus:border-[color:var(--accent)]"
        />
        <FolderSelect
          folders={folders}
          selectedFolder={selectedFolder}
          onSelect={onFolderChange}
        />
        <button
          type="submit"
          disabled={isSubmitting || queuePaused || !hasFolders}
          className="flex cursor-pointer items-center justify-between rounded-2xl bg-[color:var(--ink)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--panel)] transition hover:-translate-y-0.5 hover:bg-black/90 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
        >
          {queuePaused ? "Queue Paused" : "Queue Download"}
          <span className="text-xs">{isSubmitting ? "Working..." : "+"}</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
        <span>
          Folder{" "}
          {selectedFolderStats
            ? `${selectedFolderStats.name} · Free ${formatBytes(
                selectedFolderStats.freeBytes,
              )} / ${formatBytes(selectedFolderStats.totalBytes)}`
            : "not selected"}
        </span>
        <span>
          Queue {statsSummary.active} downloading · {statsSummary.queued} queued
          · {statsSummary.completed} done
        </span>
      </div>
      {errorMessage && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
