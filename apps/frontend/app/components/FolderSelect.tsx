import { useEffect, useRef, useState } from "react";

import { formatBytes, formatPercent } from "@/app/lib/format";
import type { FolderStat } from "@/app/lib/types";

type FolderSelectProps = {
  folders: FolderStat[];
  selectedFolder: string;
  onSelect: (folderName: string) => void;
};

export default function FolderSelect({
  folders,
  selectedFolder,
  onSelect,
}: FolderSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const hasFolders = folders.length > 0;

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (ref.current && target && !ref.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name="folder" value={selectedFolder} />
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm shadow-inner outline-none transition focus:border-[color:var(--accent)]"
      >
        <span className="font-medium text-[color:var(--ink)]">
          {selectedFolder || "Select folder"}
        </span>
        <span className="text-xs text-[color:var(--muted)]">▼</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-[0_20px_45px_-35px_rgba(26,23,18,0.8)]">
          {folders.map((folder) => {
            const usedBytes = folder.totalBytes - folder.freeBytes;
            const usedPercent = folder.totalBytes
              ? (usedBytes / folder.totalBytes) * 100
              : 0;
            const isActive = folder.name === selectedFolder;
            return (
              <button
                key={folder.name}
                type="button"
                onClick={() => {
                  onSelect(folder.name);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer flex-col gap-2 border-b border-amber-100/50 px-4 py-3 text-left text-sm transition hover:bg-amber-50 ${
                  isActive ? "bg-amber-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[color:var(--ink)]">
                    {folder.name}
                  </span>
                  <span className="text-xs text-[color:var(--muted)]">
                    {formatPercent(usedPercent)} used
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[color:var(--muted)]">
                  <span>Used {formatBytes(usedBytes)}</span>
                  <span>
                    Free {formatBytes(folder.freeBytes)} /{" "}
                    {formatBytes(folder.totalBytes)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full bg-[linear-gradient(90deg,var(--accent),#f7b06e,var(--accent-strong))] transition-[width] duration-500"
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
              </button>
            );
          })}
          {!hasFolders && (
            <div className="px-4 py-3 text-xs text-rose-600">
              No folders found in downloads.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
