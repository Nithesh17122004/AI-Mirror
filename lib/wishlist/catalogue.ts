// Server-only catalogue access for the guest wishlist.
// Never import from client components. Product verification happens HERE:
// ids from localStorage are resolved against the real catalogue and only
// ACTIVE products are returned. Missing/inactive ids are reported back so
// the client can prune them from local storage.

import { db } from "@/lib/db";
import {
  availabilityFromInventory,
  isSellableAvailability,
} from "@/lib/products/format";
import {
  getCatalogue,
  type CatalogueProduct,
} from "@/lib/products/queries";
import {
  recommendFromSignals,
  type PersonalisableProduct,
  type ScoredCandidate,
} from "@/lib/personalization/engine";
import type { WishlistProduct } from "@/lib/wishlist/types";
import { splitResolved } from "@/lib/wishlist/storage";
import type { Prisma } from "@prisma/client";

const wishlistSelect = {
  id: true,
  slug: true,
  name: true,
  priceInr: true,
  salePriceInr: true,
  imageUrl: true,
  brand: { select: { name: true, slug: true } },
  category: { select: { slug: true, name: true } },
  colours: { select: { name: true } },
  sizes: { select: { id: true, label: true, sortOrder: true } },
  inventories: { select: { sizeId: true, quantity: true } },
} as const;

type WishlistRow = Prisma.ProductGetPayload<{ select: typeof wishlistSelect }>;

function fromRow(p: WishlistRow): WishlistProduct {
  const maxSizeStock: Record<string, number> = {};
  let totalStock = 0;
  for (const i of p.inventories) {
    totalStock += i.quantity;
    maxSizeStock[i.sizeId] = (maxSizeStock[i.sizeId] ?? 0) + i.quantity;
  }
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brandName: p.brand.name,
    brandSlug: p.brand.slug,
    priceInr: p.priceInr,
    salePriceInr: p.salePriceInr,
    imageUrl: p.imageUrl,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    colours: p.colours,
    colourNames: p.colours.map((c) => c.name),
    availableSizes: p.sizes
      .filter((s) => (maxSizeStock[s.id] ?? 0) > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => s.label),
    availability: availabilityFromInventory(totalStock, p.inventories.length > 0),
  };
}

function fromCatalogue(c: CatalogueProduct): WishlistProduct {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    brandName: c.brandName,
    brandSlug: c.brandSlug,
    priceInr: c.priceInr,
    salePriceInr: c.salePriceInr,
    imageUrl: c.imageUrl,
    categorySlug: c.categorySlug,
    categoryName: c.categoryName,
    colours: c.colours,
    colourNames: c.colours.map((col) => col.name),
    availableSizes: c.availableSizes,
    availability: c.availability,
  };
}

const toSignals = (products: WishlistProduct[]): PersonalisableProduct[] =>
  products.map((p) => ({
    id: p.id,
    categorySlug: p.categorySlug,
    brandSlug: p.brandSlug,
    colourNames: p.colourNames,
    name: p.name,
  }));

/**
 * Resolve stored ids against ACTIVE catalogue products in request order.
 * Returns found products plus the ids that must be pruned.
 */
export async function resolveWishlistProducts(
  ids: string[]
): Promise<{ products: WishlistProduct[]; missing: string[] }> {
  if (ids.length === 0) return { products: [], missing: [] };
  const rows = await db.product.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    select: wishlistSelect,
  });
  const map = new Map(rows.map((row) => [row.id, row]));
  const resolvedIds = new Set(map.keys());
  const { found, missing } = splitResolved(ids, resolvedIds);
  const products = found.map((id) => fromRow(map.get(id)!));
  return { products, missing };
}

/** Deterministic "inspired by your wishlist" picks from the real catalogue. */
export async function recommendFromWishlist(
  signals: WishlistProduct[],
  limit = 6
): Promise<ScoredCandidate<WishlistProduct>[]> {
  if (signals.length === 0) return [];
  const { products: rawCandidates } = await getCatalogue({ sort: "featured" });
  // Recommendations only ever surface products we could actually sell right
  // now: products with NO inventory evidence (unknown) or zero remaining
  // stock (unavailable) are filtered out before scoring.
  const candidates = rawCandidates.filter((c) => isSellableAvailability(c.availability));
  if (candidates.length === 0) return [];
  const scored = recommendFromSignals(
    candidates.map(toSignalsLite),
    toSignals(signals),
    {
      excludeIds: new Set(signals.map((s) => s.id)),
      limit,
    }
  );
  const byId = new Map(candidates.map((c) => [c.id, fromCatalogue(c)]));
  return scored.map(({ product, score }) => ({
    product: byId.get(product.id)!,
    score,
  }));
}

function toSignalsLite(c: CatalogueProduct): PersonalisableProduct {
  return {
    id: c.id,
    categorySlug: c.categorySlug,
    brandSlug: c.brandSlug,
    colourNames: c.colours.map((col) => col.name),
    name: c.name,
  };
}