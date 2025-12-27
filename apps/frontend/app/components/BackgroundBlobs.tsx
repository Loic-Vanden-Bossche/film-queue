export default function BackgroundBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-20 top-10 h-48 w-48 animate-[float-slow_8s_ease-in-out_infinite] rounded-full bg-[color:var(--accent)]/15 blur-3xl" />
      <div className="absolute right-10 top-32 h-56 w-56 animate-[float-slow_9s_ease-in-out_infinite] rounded-full bg-[color:var(--accent-strong)]/20 blur-3xl [animation-delay:2s]" />
      <div className="absolute bottom-20 left-1/3 h-64 w-64 animate-[float-slow_10s_ease-in-out_infinite] rounded-full bg-amber-200/40 blur-[100px] [animation-delay:4s]" />
    </div>
  );
}
