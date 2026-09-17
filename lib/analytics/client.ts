"use client";

// Client-side analytics helper (Phase 9).
//
// Fire-and-forget, non-blocking, and privacy-safe:
//  - Sends ONLY allowlisted event names and a product id (see events.ts).
//  - Never waits for a response and never affects navigation/UI.
//  - Uses keepalive so a lost request at page-close is still flushed without
//    blocking, and catches every failure silently.
//
// The session id is created once per page-view, kept in browser memory ONLY
// (never stored in localStorage/cookies), and is used simply to group a
// visitor's events without identifying them.

import type { AnalyticsEventName } from "./events";

let sessionId = "";

function ensureSessionId(): string {
  if (!sessionId) {
    try {
      sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    } catch {
      sessionId = "page";
    }
  }
  return sessionId;
}

function fire(name: AnalyticsEventName, productId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ name, productId, sessionId: ensureSessionId() });
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let analytics affect the customer flow.
  }
}

export const trackEvent = {
  productView: (productId: string) => fire("product_view", productId),
  wishlistAdd: (productId: string) => fire("wishlist_add", productId),
  wishlistRemove: (productId: string) => fire("wishlist_remove", productId),
  tryOnStarted: (productId: string) => fire("try_on_started", productId),
  tryOnCompleted: (productId: string) => fire("try_on_completed", productId),
  tryOnFailed: (productId: string) => fire("try_on_failed", productId),
  sizeCheck: (productId: string) => fire("size_check", productId),
  stylistRequest: () => fire("stylist_request"),
};