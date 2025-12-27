type StatsCardsProps = {
  stats: Array<{ label: string; value: number }>;
};

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_16px_35px_-30px_rgba(26,23,18,0.6)] transition-transform duration-300 hover:-translate-y-1 animate-[fade-up_0.6s_ease-out_both]"
          style={{ animationDelay: `${0.1 + index * 0.05}s` }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {stat.label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
            {stat.value}
          </p>
        </div>
      ))}
    </>
  );
}
