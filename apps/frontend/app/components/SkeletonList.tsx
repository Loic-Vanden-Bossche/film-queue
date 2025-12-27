type SkeletonListProps = {
  count: number;
};

export default function SkeletonList({ count }: SkeletonListProps) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="h-28 animate-pulse rounded-2xl border border-amber-100/60 bg-white"
        />
      ))}
    </div>
  );
}
