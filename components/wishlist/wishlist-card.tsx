"use client";

import Link from "next/link";
import { Heart, MousePointerClick, Ruler } from "lucide-react";
import { AvailabilityBadge } from "@/components/products/product-card";
import { formatINR } from "@/lib/products/format";
import type { WishlistProduct } from "@/lib/wishlist/types";

export function WishlistCard({
  product,
  onRemove,
}: {
  product: WishlistProduct;
  onRemove: (id: string) => void;
}) {
  const hasSale = product.salePriceInr !== null;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-espresso-900/10 bg-white transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(28,25,23,0.4)]">
<div className="relative block aspect-[3/4] overflow-hidden bg-ivory-100">
        <Link
          href={`/products/${product.id}`}
          className="absolute inset-0 flex"
          aria-label={`View ${product.name}`}
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-brass-600">
              Product image coming soon
            </span>
          )}
        </Link>
        {hasSale && (
          <span className="absolute top-3 left-3 rounded-full bg-rosewood-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory-50">
            Sale
          </span>
        )}
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          aria-label={`Remove ${product.name} from wishlist`}
          className="absolute top-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-rosewood-600 shadow-sm transition-colors hover:bg-rosewood-600 hover:text-ivory-50"
        >
          <Heart className="h-5 w-5 fill-rosewood-600 text-rosewood-600" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-700">
              {product.brandName}
            </p>
            <h3 className="mt-1 font-display text-lg leading-snug text-espresso-900">
              <Link href={`/products/${product.id}`} className="hover:underline">
                {product.name}
              </Link>
            </h3>
          </div>
          <AvailabilityBadge availability={product.availability} className="shrink-0" />
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-semibold text-espresso-900">
            {formatINR(hasSale ? product.salePriceInr! : product.priceInr)}
          </span>
          {hasSale && (
            <span className="text-sm text-espresso-500 line-through">
              {formatINR(product.priceInr)}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-espresso-500">
          {product.colours.map((c) => c.name).join(" · ") || "Colours"}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-espresso-900/10 pt-4">
          <Link
            href={`/size?product=${product.id}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-espresso-900/20 px-3.5 text-[13px] font-semibold text-espresso-900 transition-colors hover:border-espresso-900/50"
          >
            <Ruler className="h-4 w-4" aria-hidden="true" />
            Find My Size
          </Link>
          <Link
            href={`/try-on?product=${product.id}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-espresso-900 px-3.5 text-[13px] font-semibold text-ivory-50 transition-colors hover:bg-espresso-700"
          >
            <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            Try This On
          </Link>
        </div>
      </div>
    </article>
  );
}