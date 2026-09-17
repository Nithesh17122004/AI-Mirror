export const STORE_CODE = "DEMO-STORE-01";

export type Availability =
  | "in-stock"
  | "limited"
  | "unavailable"
  | "unknown";

/**
 * Customer-facing availability bucketing. Never exposes raw counts.
 * `unknown` is reserved for products with NO inventory evidence at all —
 * we never claim stock we cannot see.
 */
export function availabilityFromTotal(total: number): Availability {
  if (total <= 0) return "unavailable";
  if (total <= 2) return "limited";
  return "in-stock";
}

/**
 * Bucket availability from evidence. A product with no inventory rows has
 * unknown availability; `availabilityFromTotal` is only meaningful when
 * inventory evidence exists.
 */
export function availabilityFromInventory(
  total: number,
  hasInventoryRows: boolean
): Availability {
  if (!hasInventoryRows) return "unknown";
  return availabilityFromTotal(total);
}

/** Rank used to order buckets (in-stock first). Highest = least desirable. */
export const AVAILABILITY_RANK: Record<Availability, number> = {
  "in-stock": 0,
  limited: 1,
  unavailable: 2,
  unknown: 3,
};

export const availabilityLabel: Record<Availability, string> = {
  "in-stock": "In stock",
  limited: "Limited availability",
  unavailable: "Currently unavailable",
  unknown: "Availability unknown",
};

/** Buckets that should never be advertised as "available". */
export function isSellableAvailability(availability: Availability): boolean {
  return availability === "in-stock" || availability === "limited";
}

/** Format a paise-less INR amount the way Indian shoppers read prices. */
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

/**
 * Effective selling price: the discounted price when a sale is active,
 * otherwise the regular price.
 */
export function effectivePrice(product: {
  priceInr: number;
  salePriceInr: number | null;
}): number {
  return product.salePriceInr !== null && product.salePriceInr >= 0
    ? product.salePriceInr
    : product.priceInr;
}