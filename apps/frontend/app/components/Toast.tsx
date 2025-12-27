type ToastProps = {
  message: string;
  tone: "success" | "error" | "info";
};

export default function Toast({ message, tone }: ToastProps) {
  return (
    <div className="fixed right-6 top-6 z-50 w-full max-w-sm animate-[fade-up_0.4s_ease-out_both]">
      <div
        className={`rounded-2xl border px-4 py-3 text-sm shadow-[0_18px_40px_-30px_rgba(26,23,18,0.8)] ${
          tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
