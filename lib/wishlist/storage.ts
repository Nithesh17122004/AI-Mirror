// Pure, isomorphic storage helpers for guest wishlist + recently-viewed.
// These deliberately operate on injected Storage-like objects so the rules
// can be unit-tested without a browser.
//
// GUEST-FIRST + PRIVACY:
//  - Only NON-SENSITIVE product identifiers are ever stored.
//  - No photos, images, measurements, biometrics, conversations or user
//    profile data. Never store full product objects.
//  - All read/parse failures degrade to empty lists; mutations degrade to
//    in-memory session state rather than crashing the app.

export const WISHLIST_KEY = "iris-wishlist";
export const RECENTLY_VIEWED_KEY = "iris-recently-viewed";

/** Hard cap so a hostile/corrupt value can never blow up memory or the API. */
export const WISHLIST_MAX_IDS = 200;
export const RECENTLY_VIEWED_MAX_IDS = 12;

/** Minimal surface of the Web Storage API, so tests can inject a fake. */
export type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

/** True when an id is a plausible product identifier (NOT a security check). */
export function isStoredId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 100 &&
    /^[a-zA-Z0-9-_]+$/.test(value)
  );
}

/** Parse a stored JSON array into valid, deduplicated, capped ids. */
export function parseStoredIds(raw: string | null, cap: number): string[] {
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of parsed) {
    if (ids.length >= cap) break;
    if (!isStoredId(value) || seen.has(value)) continue;
    seen.add(value);
    ids.push(value);
  }
  return ids;
}

/** Read ids from storage; any failure (private mode, quotas) → empty list. */
export function readStoredIds(
  storage: StorageLike | null,
  key: string,
  cap: number
): string[] {
  if (!storage) return [];
  try {
    return parseStoredIds(storage.getItem(key), cap);
  } catch {
    return [];
  }
}

/** Write ids back; returns false when storage is unavailable/blocked. */
export function writeStoredIds(
  storage: StorageLike | null,
  key: string,
  ids: string[]
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(ids.slice(0, capFor(key))));
    return true;
  } catch {
    return false;
  }
}

function capFor(key: string): number {
  return key === WISHLIST_KEY ? WISHLIST_MAX_IDS : RECENTLY_VIEWED_MAX_IDS;
}

// --- Pure list algebra (append-order, dedup, caps) -------------------------

/** Add an id once, preserving order. */
export function addId(ids: string[], id: string, cap: number): string[] {
  if (!isStoredId(id) || ids.includes(id)) return [...ids];
  return [...ids, id].slice(-cap);
}

/** Remove an id if present. */
export function removeId(ids: string[], id: string): string[] {
  return ids.filter((existing) => existing !== id);
}

/** Toggle membership. Returns the new list. */
export function toggleId(ids: string[], id: string, cap: number): string[] {
  return ids.includes(id) ? removeId(ids, id) : addId(ids, id, cap);
}

/** Prepend id for "recently viewed", newest first, deduped, capped. */
export function prependId(ids: string[], id: string, cap: number): string[] {
  if (!isStoredId(id)) return [...ids];
  const without = removeId(ids, id);
  return [id, ...without].slice(0, cap);
}

/**
 * Split requested ids into { found, missing } given the id set that actually
 * resolved against the catalogue. `missing` preserves request order.
 */
export function splitResolved(
  requested: string[],
  resolvedIds: ReadonlySet<string>
): { found: string[]; missing: string[] } {
  const found: string[] = [];
  const missing: string[] = [];
  for (const id of requested) {
    (resolvedIds.has(id) ? found : missing).push(id);
  }
  return { found, missing };
}