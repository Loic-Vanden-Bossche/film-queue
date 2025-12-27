type QueueFiltersProps = {
  query: string;
  statusFilter: string;
  sortMode: string;
  compactView: boolean;
  filteredCount: number;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onRefresh: () => void;
  onCompactToggle: () => void;
};

export default function QueueFilters({
  query,
  statusFilter,
  sortMode,
  compactView,
  filteredCount,
  totalCount,
  onQueryChange,
  onStatusChange,
  onSortChange,
  onRefresh,
  onCompactToggle,
}: QueueFiltersProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Queue timeline</h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {filteredCount} of {totalCount}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-[color:var(--ink)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--ink)] transition hover:bg-[color:var(--ink)] hover:text-[color:var(--panel)] cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onCompactToggle}
            className="rounded-full border border-amber-200 px-4 py-2 text-xs uppercase tracking-[0.3em] text-amber-700 transition hover:border-amber-400 cursor-pointer"
          >
            {compactView ? "Expanded" : "Compact"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,0.6fr)]">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by URL or filename..."
          className="w-full rounded-2xl border border-amber-100 bg-white px-4 py-2 text-sm shadow-inner outline-none transition focus:border-[color:var(--accent)]"
        />
        <select
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value)}
          className="w-full rounded-2xl border border-amber-100 bg-white px-4 py-2 text-sm shadow-inner outline-none transition focus:border-[color:var(--accent)]"
        >
          <option value="all">All statuses</option>
          <option value="waiting">Queued</option>
          <option value="active">Downloading</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
          <option value="delayed">Delayed</option>
        </select>
        <select
          value={sortMode}
          onChange={(event) => onSortChange(event.target.value)}
          className="w-full rounded-2xl border border-amber-100 bg-white px-4 py-2 text-sm shadow-inner outline-none transition focus:border-[color:var(--accent)]"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="progress">Most complete</option>
        </select>
      </div>
    </>
  );
}
