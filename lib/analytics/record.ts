// Server-side, best-effort analytics recording (Phase 9).
//
// Records one non-sensitive analytics row (see events.ts). Guarantees:
//  - NEVER throws: analytics can never break the customer flow.
//  - NEVER blocks a customer response on a slow/unreachable database.
//  - Persists ONLY the validated, allowlisted payload (a product id).
//
// The `insert` seam lets tests swap in a fake; production uses Prisma.

import type { AnalyticsEventName } from "./events";

export type AnalyticsInsert = (input: {
  name: string;
  sessionId: string | null;
  payload: Record<string, string> | null;
}) => Promise<unknown>;

const prismaInsert: AnalyticsInsert = async ({ name, sessionId, payload }) => {
  // Lazy import keeps this module safe to import anywhere server-side.
  const { db } = await import("@/lib/db");
  return db.analyticsEvent.create({
    data: { name, sessionId, payload: payload ?? undefined },
  });
};

/**
 * Fire-and-forget: record an event if the database is reachable, otherwise
 * drop it silently. The returned promise always resolves.
 */
export async function recordAnalyticsEvent(
  name: AnalyticsEventName,
  options: { sessionId?: string; productId?: string; insert?: AnalyticsInsert } = {}
): Promise<void> {
  const safeProductId =
    options.productId && /^[a-zA-Z0-9-_]{1,100}$/.test(options.productId)
      ? options.productId
      : undefined;
  const safeSessionId =
    options.sessionId && /^[a-zA-Z0-9_]{1,64}$/.test(options.sessionId)
      ? options.sessionId
      : null;

  const insert = options.insert ?? prismaInsert;
  try {
    await insert({
      name,
      sessionId: safeSessionId,
      payload: safeProductId ? { productId: safeProductId } : null,
    });
  } catch {
    // Analytics is best-effort by design. Do not log, do not surface, and do
    // NOT let this path interfere with the customer request that triggered it.
  }
}

/** Convenience: `recordAnalyticsEvent` that is awaited but cannot throw. */
export async function recordAnalyticsEventSafe(
  ...args: Parameters<typeof recordAnalyticsEvent>
): Promise<void> {
  return recordAnalyticsEvent(...args);
}