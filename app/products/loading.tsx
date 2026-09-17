export default function ProductsLoading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="h-4 w-40 animate-pulse rounded-full bg-espresso-900/10" />
      <div className="mt-3 h-10 w-72 animate-pulse rounded-xl bg-espresso-900/10" />
      <div className="mt-8 animate-pulse lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="space-y-4">
            <div className="h-4 w-20 rounded bg-espresso-900/10" />
            <div className="h-3 w-28 rounded bg-espresso-900/10" />
            <div className="h-3 w-24 rounded bg-espresso-900/10" />
            <div className="h-3 w-32 rounded bg-espresso-900/10" />
          </div>
        </aside>
        <div>
          <div className="grid animate-pulse gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-espresso-900/10 bg-white">
                <div className="aspect-[3/4] bg-espresso-900/[0.06]" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded bg-espresso-900/10" />
                  <div className="h-4 w-1/2 rounded bg-espresso-900/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading products…</span>
    </div>
  );
}