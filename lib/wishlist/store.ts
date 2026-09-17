"use client";

import { useSyncExternalStore } from "react";
import {
  addId,
  prependId,
  readStoredIds,
  RECENTLY_VIEWED_KEY,
  removeId,
  toggleId,
  WISHLIST_KEY,
  WISHLIST_MAX_IDS,
  writeStoredIds,
  type StorageLike,
} from "@/lib/wishlist/storage";
import { trackEvent } from "@/lib/analytics/client";

export type StorageMode = "persistent" | "memory";

type Snapshot = {
  ids: readonly string[];
  count: number;
  /** "persistent" = browser storage; "memory" = storage unavailable fallback. */
  mode: StorageMode;
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(list: "wishlist" | "recent"): string[] {
  const storage = getStorage();
  const key = list === "wishlist" ? WISHLIST_KEY : RECENTLY_VIEWED_KEY;
  const cap = list === "wishlist" ? WISHLIST_MAX_IDS : 12;
  return readStoredIds(storage, key, cap);
}

// --- Wishlist (guest, product-ids only) -----------------------------------

const wishlistListeners = new Set<() => void>();
let wishlistIds: string[] = [];
let wishlistMode: StorageMode = "persistent";
let wishlistHydrated = false;

function loadWishlist(): void {
  if (wishlistHydrated) return;
  wishlistHydrated = true;
  if (getStorage() === null) {
    wishlistIds = [];
    wishlistMode = "memory";
    return;
  }
  wishlistIds = read("wishlist");
  wishlistMode = "persistent";
}

function commitWishlist(next: string[]): void {
  wishlistIds = next;
  const storage: StorageLike | null = getStorage();
  if (storage && writeStoredIds(storage, WISHLIST_KEY, wishlistIds)) {
    wishlistMode = "persistent";
  } else {
    wishlistMode = "memory";
  }
  emitWishlist();
}

function emitWishlist(): void {
  for (const listener of [...wishlistListeners]) listener();
}

let wishlistCached: Snapshot | null = null;

function getWishlistSnapshot(): Snapshot {
  loadWishlist();
  if (!wishlistCached || wishlistCached.ids !== wishlistIds) {
    wishlistCached = {
      ids: wishlistIds,
      count: wishlistIds.length,
      mode: wishlistMode,
    };
  }
  return wishlistCached;
}

const SSR_SNAPSHOT: Snapshot = { ids: [], count: 0, mode: "persistent" };

function getWishlistServerSnapshot(): Snapshot {
  return SSR_SNAPSHOT;
}

function subscribeWishlist(onChange: () => void): () => void {
  loadWishlist();
  wishlistListeners.add(onChange);
  return () => wishlistListeners.delete(onChange);
}

// --- Recently viewed (guest, product-ids only, newest first) --------------

const recentListeners = new Set<() => void>();
let recentIds: string[] = [];
let recentHydrated = false;

function loadRecent(): void {
  if (recentHydrated) return;
  recentHydrated = true;
  recentIds = read("recent");
}

function commitRecent(next: string[]): void {
  recentIds = next;
  const storage: StorageLike | null = getStorage();
  if (storage) writeStoredIds(storage, RECENTLY_VIEWED_KEY, recentIds);
  emitRecent();
}

function emitRecent(): void {
  for (const listener of [...recentListeners]) listener();
}

let recentCached: Snapshot | null = null;

function getRecentSnapshot(): Snapshot {
  loadRecent();
  if (!recentCached || recentCached.ids !== recentIds) {
    recentCached = { ids: recentIds, count: recentIds.length, mode: "persistent" };
  }
  return recentCached;
}

function subscribeRecent(onChange: () => void): () => void {
  loadRecent();
  recentListeners.add(onChange);
  return () => recentListeners.delete(onChange);
}

const RECENT_SSR_SNAPSHOT: Snapshot = { ids: [], count: 0, mode: "persistent" };

function getRecentServerSnapshot(): Snapshot {
  return RECENT_SSR_SNAPSHOT;
}

// --- Hooks -----------------------------------------------------------------

const wishlistActions = {
  add: (id: string): void => {
    loadWishlist();
    const wasSaved = wishlistIds.includes(id);
    commitWishlist(addId(wishlistIds, id, WISHLIST_MAX_IDS));
    if (!wasSaved) trackEvent.wishlistAdd(id);
  },
  remove: (id: string): void => {
    loadWishlist();
    const wasSaved = wishlistIds.includes(id);
    commitWishlist(removeId(wishlistIds, id));
    if (wasSaved) trackEvent.wishlistRemove(id);
  },
  toggle: (id: string): void => {
    loadWishlist();
    const wasSaved = wishlistIds.includes(id);
    commitWishlist(toggleId(wishlistIds, id, WISHLIST_MAX_IDS));
    if (wasSaved) trackEvent.wishlistRemove(id);
    else trackEvent.wishlistAdd(id);
  },
  /** Drop ids that failed catalogue verification (prune step). */
  prune: (missing: readonly string[]): void => {
    loadWishlist();
    if (missing.length === 0) return;
    let next = wishlistIds;
    for (const id of missing) next = removeId(next, id);
    if (next.length !== wishlistIds.length) commitWishlist(next);
  },
};

const recentActions = {
  noteViewed: (id: string): void => {
    loadRecent();
    commitRecent(prependId(recentIds, id, 12));
  },
  prune: (missing: readonly string[]): void => {
    loadRecent();
    if (missing.length === 0) return;
    let next = recentIds;
    for (const id of missing) next = removeId(next, id);
    if (next.length !== recentIds.length) commitRecent(next);
  },
};

/** Guest wishlist state + mutations. Storage is product IDs only. */
export function useWishlist() {
  const snapshot = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  );
  return {
    ...snapshot,
    isHydrated: snapshot !== SSR_SNAPSHOT,
    ...wishlistActions,
  };
}

/** Guest recently-viewed state (browsing only; no recommendations here). */
export function useRecentlyViewed() {
  const snapshot = useSyncExternalStore(
    subscribeRecent,
    getRecentSnapshot,
    getRecentServerSnapshot
  );
  return {
    ...snapshot,
    isHydrated: snapshot !== RECENT_SSR_SNAPSHOT,
    ...recentActions,
  };
}