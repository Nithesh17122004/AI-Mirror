// Non-sensitive analytics event allowlist + validation (Phase 9).
//
// Only business events with no personal data are ever recorded:
//   product_view, wishlist_add, wishlist_remove, try_on_started,
//   try_on_completed, try_on_failed, size_check, stylist_request.
//
// NEVER collect: photos, camera frames, measurements, face data, biometrics,
// AI conversation contents, API keys, or authentication secrets. The payload
// for every event carries at most a product id and an ephemeral session id.

import { z } from "zod";

const EVENT_NAMES = [
  "product_view",
  "wishlist_add",
  "wishlist_remove",
  "try_on_started",
  "try_on_completed",
  "try_on_failed",
  "size_check",
  "stylist_request",
] as const;

export type AnalyticsEventName = (typeof EVENT_NAMES)[number];

export const ANALYTICS_EVENT_NAMES: readonly AnalyticsEventName[] = EVENT_NAMES;

/**
 * Validate a client-reported event. `sessionId` is an ephemeral id generated
 * per page-view and kept in browser memory only (never a cookie, never
 * localStorage). `productId` must look like a catalogue id.
 */
export const analyticsEventSchema = z.object({
  name: z.enum(EVENT_NAMES),
  sessionId: z.string().trim().min(1).max(64).optional(),
  productId: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9-_]+$/)
    .optional(),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

/** True when the traffic "session id" is a safe short random token. */
export function isSafeSessionId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(value);
}

/** Event names that legitimately carry a product id. */
export function eventTakesProduct(event: AnalyticsEventName): boolean {
  return [
    "product_view",
    "wishlist_add",
    "wishlist_remove",
    "try_on_started",
    "try_on_completed",
    "try_on_failed",
    "size_check",
  ].includes(event);
}

/** Only product ids (bounded, validated) may reach the persisted payload. */
export function buildSafePayload(
  event: AnalyticsEventName,
  productId: string | undefined
): Record<string, string> | undefined {
  if (productId === undefined || !eventTakesProduct(event)) return undefined;
  return { productId };
}