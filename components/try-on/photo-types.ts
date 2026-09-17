// Shared, serialisable types for the Phase 3 customer photo flow.
// No DOM access here — browser helpers live in `photo-file.ts`.

export type PhotoSource = "upload" | "camera";

/**
 * Customer photo lifecycle. Kept deliberately small:
 * - `idle` — no photo yet
 * - `reading` — validating / decoding a chosen file (brief, local only)
 * - `camera` — camera interface is open
 * - `preview` — photo loaded, awaiting Retake / Remove / Continue
 * - `ready` — customer confirmed; Phase-4-ready state, photo kept in memory
 */
export type PhotoStatus = "idle" | "reading" | "camera" | "preview" | "ready";

export type PhotoError = {
  /** Short machine-readable code for logging/telemetry (never image data). */
  code: string;
  /** Customer-friendly message. Never a raw browser error. */
  message: string;
};

/** Minimal product context carried through the photo workflow. */
export type TryOnProductSummary = {
  id: string;
  name: string;
  brandName: string;
  priceInr: number;
  salePriceInr: number | null;
  imageUrl: string | null;
};
