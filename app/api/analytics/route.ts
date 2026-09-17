// POST /api/analytics — non-sensitive analytics ingestion (Phase 9).
//
// Accepts only the allowlisted event names + a product id (see
// lib/analytics/events.ts). Validation is strict; anything else is rejected.
// Recording is best-effort and never blocks the customer: a failing database
// still returns 204 so the client flow is unaffected in every case.
//
//   POST {"name":"product_view","productId":"...","sessionId":"..."} -> 204
//   Invalid body                                          -> 400
//   Non-POST                                              -> 405
//   Optics                                                -> 204

import { NextResponse } from "next/server";
import { analyticsEventSchema } from "@/lib/analytics/events";
import { recordAnalyticsEvent } from "@/lib/analytics/record";

export async function POST(request: Request): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "invalid-request", message: "Request body must be JSON." } },
      { status: 400 }
    );
  }

  const parsed = analyticsEventSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "invalid-request", message: "Unknown analytics event or invalid payload." } },
      { status: 400 }
    );
  }

  const { name, productId, sessionId } = parsed.data;
  // Best-effort: never throw, never await beyond the DB's own speed.
  await recordAnalyticsEvent(name, { sessionId, productId });

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}