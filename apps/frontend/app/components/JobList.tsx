import JobCard from "@/app/components/JobCard";
import SkeletonList from "@/app/components/SkeletonList";
import type { Job } from "@/app/lib/types";

type JobListProps = {
  jobs: Job[];
  hasLoaded: boolean;
  isRefreshing: boolean;
  compactView: boolean;
  cancellingIds: Set<string>;
  clock: number;
  onCancel: (jobId: string) => void;
  hasAnyJobs: boolean;
};

export default function JobList({
  jobs,
  hasLoaded,
  isRefreshing,
  compactView,
  cancellingIds,
  clock,
  onCancel,
  hasAnyJobs,
}: JobListProps) {
  if (!hasLoaded) {
    return <SkeletonList count={3} />;
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-6 text-sm text-[color:var(--muted)]">
        {hasAnyJobs
          ? "No matching downloads. Try adjusting your filters."
          : "No downloads yet. Queue a link to see activity here."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job, index) => (
        <JobCard
          key={job.id}
          job={job}
          index={index}
          compactView={compactView}
          isRefreshing={isRefreshing}
          isCancelling={cancellingIds.has(job.id)}
          clock={clock}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}
