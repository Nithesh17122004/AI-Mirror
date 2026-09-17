export default function ProductDetailLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12"
    >
      <div className="h-4 w-64 animate-pulse rounded-full bg-espresso-900/10" />
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="aspect-[3/4] animate-pulse rounded-[2rem] border border-espresso-900/10 bg-espresso-900/[0.06]" />
        <div className="animate-pulse space-y-4">
          <div className="h-3 w-20 rounded bg-espresso-900/10" />
          <div className="h-10 w-3/4 rounded-xl bg-espresso-900/10" />
          <div className="h-8 w-28 rounded-xl bg-espresso-900/10" />
          <div className="h-3 w-24 rounded-full bg-espresso-900/10" />
          <div className="h-4 w-full rounded bg-espresso-900/10" />
          <div className="h-4 w-full rounded bg-espresso-900/10" />
          <div className="h-4 w-2/3 rounded bg-espresso-900/10" />
        </div>
      </div>
      <span className="sr-only">Loading product details…</span>
    </div>
  );
}