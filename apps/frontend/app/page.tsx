"use client";

import { useMemo, useState } from "react";

import BackgroundBlobs from "@/app/components/BackgroundBlobs";
import JobList from "@/app/components/JobList";
import QueueControlsCard from "@/app/components/QueueControlsCard";
import QueueFilters from "@/app/components/QueueFilters";
import QueueForm from "@/app/components/QueueForm";
import QueueProgressCard from "@/app/components/QueueProgressCard";
import StatsCards from "@/app/components/StatsCards";
import SystemStatusCard from "@/app/components/SystemStatusCard";
import Toast from "@/app/components/Toast";
import useQueueData from "@/app/hooks/useQueueData";
import { filterAndSortJobs } from "@/app/lib/queueFilters";
import {
  computeQueueStats,
  getOverallEta,
  getOverallPercent,
} from "@/app/lib/queueMetrics";

export default function Home() {
  const {
    jobs,
    isSubmitting,
    isConnected,
    errorMessage,
    clock,
    cancelling,
    queuePaused,
    health,
    folders,
    selectedFolder,
    toast,
    isRefreshing,
    hasLoaded,
    lastUpdated,
    queueUpdating,
    setSelectedFolder,
    fetchJobs,
    handleSubmit,
    handleCancel,
    handleQueueToggle,
  } = useQueueData();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState("newest");
  const [compactView, setCompactView] = useState(false);

  const stats = useMemo(() => computeQueueStats(jobs, clock), [jobs, clock]);
  const overallPercent = getOverallPercent(stats);
  const overallEta = getOverallEta(stats);

  const filteredJobs = useMemo(
    () => filterAndSortJobs(jobs, { query, statusFilter, sortMode }),
    [jobs, query, statusFilter, sortMode],
  );

  const selectedFolderStats = useMemo(
    () => folders.find((folder) => folder.name === selectedFolder) || null,
    [folders, selectedFolder],
  );

  return (
    <div className="relative min-h-screen px-6 py-12 text-[15px] text-[color:var(--ink)] sm:px-10">
      {toast && <Toast message={toast.message} tone={toast.tone} />}
      <BackgroundBlobs />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-6 animate-[fade-up_0.7s_ease-out_both] [animation-delay:0.02s]">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--muted)]">
              Film Queue
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--ink)] sm:text-5xl">
              Downloads, orchestrated.
            </h1>
            <p className="max-w-xl text-base text-[color:var(--muted)]">
              Track every link in the pipeline. The worker streams progress from
              Redis and your dashboard stays synced in real time.
            </p>
          </div>
          <SystemStatusCard
            health={health}
            isConnected={isConnected}
            lastUpdated={lastUpdated}
          />
        </header>

        <section className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] animate-[fade-up_0.7s_ease-out_both] [animation-delay:0.08s]">
          <QueueForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            queuePaused={queuePaused}
            hasFolders={folders.length > 0}
            folders={folders}
            selectedFolder={selectedFolder}
            onFolderChange={setSelectedFolder}
            selectedFolderStats={selectedFolderStats}
            errorMessage={errorMessage}
            statsSummary={{
              active: stats.active,
              queued: stats.queued,
              completed: stats.completed,
            }}
          />

          <div className="grid gap-4">
            <QueueControlsCard
              queuePaused={queuePaused}
              queueUpdating={queueUpdating}
              onToggle={handleQueueToggle}
            />
            <QueueProgressCard
              overallPercent={overallPercent}
              knownBytes={stats.knownBytes}
              totalBytes={stats.totalBytes}
              remainingBytes={stats.remainingBytes}
              overallEta={overallEta}
              rate={stats.rate}
            />
            <StatsCards
              stats={[
                { label: "Total jobs", value: stats.total },
                { label: "Downloading", value: stats.active },
                { label: "Queued", value: stats.queued },
                { label: "Completed", value: stats.completed },
                { label: "Failed", value: stats.failed },
              ]}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_25px_60px_-45px_rgba(26,23,18,0.9)] animate-[fade-up_0.7s_ease-out_both] [animation-delay:0.1s]">
          <QueueFilters
            query={query}
            statusFilter={statusFilter}
            sortMode={sortMode}
            compactView={compactView}
            filteredCount={filteredJobs.length}
            totalCount={jobs.length}
            onQueryChange={setQuery}
            onStatusChange={setStatusFilter}
            onSortChange={setSortMode}
            onRefresh={fetchJobs}
            onCompactToggle={() => setCompactView((prev) => !prev)}
          />

          <div className="mt-5">
            <JobList
              jobs={filteredJobs}
              hasLoaded={hasLoaded}
              isRefreshing={isRefreshing}
              compactView={compactView}
              cancellingIds={cancelling}
              clock={clock}
              onCancel={handleCancel}
              hasAnyJobs={jobs.length > 0}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
