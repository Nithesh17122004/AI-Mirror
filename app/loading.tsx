export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6"
    >
      <div className="animate-pulse">
        <div className="h-4 w-40 rounded-full bg-espresso-900/10" />
        <div className="mt-4 h-10 w-2/3 rounded-xl bg-espresso-900/10" />
        <div className="mt-3 h-5 w-1/2 rounded-xl bg-espresso-900/10" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-espresso-900/10 bg-white"
            />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
