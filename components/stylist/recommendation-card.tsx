"use client";

import Link from "next/link";
import { Ruler } from "lucide-react";
import { ProductCard } from "@/components/products/product-card";
import { cn } from "@/lib/utils";

// Structural, JSON-serialisable shape of one recommendation as returned by
// POST /api/stylist. Kept local so the client never imports server modules.
export type StylistCardProduct = {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  categorySlug: string;
  categoryName: string;
  priceInr: number;
  salePriceInr: number | null;
  effectivePriceInr: number;
  priceLabel: string;
  imageUrl: string | null;
  colours: string[];
  availableSizes: string[];
  availability: "in-stock" | "limited" | "unavailable" | "unknown";
  gender: "MEN" | "WOMEN" | "UNISEX";
};

export type StylistCardRecommendation = {
  product: StylistCardProduct;
  reason: string;
  links: { product: string; size: string; tryOn: string };
};

function toCardProduct(product: StylistCardProduct) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brandName: product.brandName,
    priceInr: product.priceInr,
    salePriceInr: product.salePriceInr,
    imageUrl: product.imageUrl,
    colours: product.colours.map((name) => ({ name })),
    availableSizes: product.availableSizes,
    availability: product.availability,
  };
}

export function StylistRecommendationCard({
  recommendation,
  className,
}: {
  recommendation: StylistCardRecommendation;
  className?: string;
}) {
  const { product, reason, links } = recommendation;
  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="rounded-xl border-l-2 border-brass-500 bg-ivory-100 px-3.5 py-2.5 text-[13px] leading-6 text-espresso-700 italic">
        {reason}
      </p>
      <ProductCard product={toCardProduct(product)} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-ivory-50 px-3.5 py-2.5">
        <span className="inline-flex rounded-full bg-espresso-900/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-espresso-700">
          {product.categoryName}
        </span>
        <Link
          href={links.size}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-espresso-900 underline-offset-4 hover:underline"
        >
          <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
          Find My Size
        </Link>
        <span className="ml-auto text-[11px] text-espresso-500">
          {product.priceLabel}
        </span>
      </div>
    </div>
  );
}