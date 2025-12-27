import type { Job } from "@/app/lib/types";

type FilterOptions = {
  query: string;
  statusFilter: string;
  sortMode: string;
};

export function filterAndSortJobs(jobs: Job[], options: FilterOptions) {
  const normalizedQuery = options.query.trim().toLowerCase();
  const sorted = [...jobs];

  sorted.sort((a, b) => {
    if (options.sortMode === "oldest") {
      return a.createdAt - b.createdAt;
    }
    if (options.sortMode === "progress") {
      const aTotal = a.totalBytes || 0;
      const bTotal = b.totalBytes || 0;
      const aPercent = aTotal ? a.bytes / aTotal : 0;
      const bPercent = bTotal ? b.bytes / bTotal : 0;
      return bPercent - aPercent;
    }
    return b.createdAt - a.createdAt;
  });

  return sorted.filter((job) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      job.url.toLowerCase().includes(normalizedQuery) ||
      (job.filename || "").toLowerCase().includes(normalizedQuery);
    const matchesStatus =
      options.statusFilter === "all" || job.status === options.statusFilter;
    return matchesQuery && matchesStatus;
  });
}
