"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, Heart, RefreshCw, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/products/product-card";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRecentlyViewed, useWishlist } from "@/lib/wishlist/store";
import type { WishlistApiResult } from "@/lib/wishlist/types";

const EMPTY_RESULT: WishlistApiResult = {
  products: [],
  missing: [],
  recentlyViewed: [],
  missingRecent: [],
  recommendations: [],
};

export default function WishlistPage() {
  const wishlist = useWishlist();
  const recent = useRecentlyViewed();
  const [result, setResult] = React.useState<WishlistApiResult | null>(null);
  const [retryable, setRetryable] = React.useState(false);
  const [loadKey, setLoadKey] = React.useState(0);

  const idsKey = wishlist.ids.join(",");
  const recentKey = recent.ids.join(",");
  const hasIds = idsKey !== "" || recentKey !== "";
  const hydrated = wishlist.isHydrated && recent.isHydrated;

  React.useEffect(() => {
    if (!hasIds) return;
    let cancelled = false;
    const controller = new AbortController();
    fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productIds: idsKey ? idsKey.split(",") : [],
        recentlyViewedIds: recentKey ? recentKey.split(",") : [],
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = (await res.json()) as
          | { success: true; result: WishlistApiResult }
          | { success: false; error: { code: string; retryable: boolean } };
        if (cancelled) return;
        if (!res.ok || !body.success) {
          setRetryable(body.success === false ? body.error.retryable : false);
          setResult(null);
          return;
        }
        if (body.result.missing.length > 0) wishlist.prune(body.result.missing);
        if (body.result.missingRecent.length > 0) recent.prune(body.result.missingRecent);
        setResult(body.result);
        setRetryable(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRetryable(true);
        setResult(null);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, recentKey, loadKey]);

  const ready = hasIds ? result : EMPTY_RESULT;
  const isLoading = !hydrated || (hasIds && ready === null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-brass-600">
          Guest wishlist
        </p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-espresso-900">
          Your wishlist
        </h1>
        <p className="mt-2 text-sm leading-6 text-espresso-500">
          Saved on this device — no account needed. We keep only product
          references, never photos or measurements.
        </p>
      </header>

      <div className="mt-8">
        {isLoading && <WishlistSkeleton />}

        {retryable && <ErrorState onRetry={() => setLoadKey((k) => k + 1)} />}

        {ready && ready.products.length === 0 && (
          <EmptyWishlist
            hadItems={idsKey.length > 0}
            storageNote={wishlist.mode === "memory"}
          />
        )}

        {ready && ready.products.length > 0 && !retryable && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-espresso-600">
                {ready.products.length} saved piece{ready.products.length === 1 ? "" : "s"}
              </p>
              {wishlist.mode === "memory" && (
                <p className="rounded-full bg-brass-100 px-3.5 py-1.5 text-xs font-semibold text-brass-700">
                  Storage unavailable — saved for this session only
                </p>
              )}
            </div>
            {ready.missing.length > 0 && (
              <p className="mt-3 rounded-xl bg-ivory-100 px-4 py-3 text-[13px] leading-6 text-espresso-500">
                {ready.missing.length} saved item{ready.missing.length === 1 ? "" : "s"} no
                longer available and {ready.missing.length === 1 ? "was" : "were"} removed
                from this list.
              </p>
            )}
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {ready.products.map((product) => (
                <li key={product.id}>
                  <WishlistCard
                    product={product}
                    onRemove={(id) => wishlist.remove(id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {ready && ready.recommendations.length > 0 && !retryable && (
          <section aria-labelledby="inspired-heading" className="mt-14">
            <h2
              id="inspired-heading"
              className="flex items-center gap-2 font-display text-2xl font-medium text-espresso-900"
            >
              <Sparkles className="h-5 w-5 text-brass-600" aria-hidden="true" />
              Inspired by your wishlist
            </h2>
            <p className="mt-1 text-sm text-espresso-500">
              Picked from the live catalogue by matching categories, brands and
              colours you saved. Deterministic — no AI involved.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {ready.recommendations.map(({ product }) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {ready && ready.recentlyViewed.length > 0 && !retryable && (
          <section aria-labelledby="recent-heading" className="mt-14">
            <h2
              id="recent-heading"
              className="flex items-center gap-2 font-display text-2xl font-medium text-espresso-900"
            >
              <Clock className="h-5 w-5 text-brass-600" aria-hidden="true" />
              Recently viewed
            </h2>
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {ready.recentlyViewed.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function WishlistSkeleton() {
  return (
    <p
      className="rounded-2xl border border-dashed border-espresso-900/15 bg-white px-6 py-16 text-center text-sm text-espresso-500"
      role="status"
    >
      Loading your wishlist…
    </p>
  );
}

function EmptyWishlist({
  hadItems,
  storageNote,
}: {
  hadItems: boolean;
  storageNote: boolean;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-espresso-900/15 bg-white px-6 py-16 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-ivory-100 text-brass-700">
        <Heart className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-2xl text-espresso-900">
        {hadItems ? "No saved pieces left" : "Your wishlist is empty"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-espresso-500">
        {hadItems
          ? "The saved pieces are no longer available, so they were removed."
          : "Save pieces you love and find them again anytime."}
      </p>
      {storageNote && (
        <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-espresso-500">
          This browser blocked local storage, so a wishlist can only live for
          this session.
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/products">Explore the catalogue</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/stylist">Ask the AI Stylist</Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <h2 className="font-display text-2xl text-espresso-900">
          Couldn&apos;t load your wishlist
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-espresso-500">
          The product database wasn&apos;t reachable. Your saved items are
          still on this device.
        </p>
        <div className="mt-6">
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}