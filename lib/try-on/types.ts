// Domain types for the virtual try-on service (Phase 4).
// Shared by the API route, service, providers, and client UI.
// No React or DOM types here so server code can import freely.

export type TryOnPhase = "idle" | "preparing" | "processing" | "completed" | "failed";

/** Photo sources carried over from Phase 3. */
export type TryOnPhotoSource = "upload" | "camera";

/**
 * Abstraction over how provider image data is carried, so nothing below
 * the provider interface depends on `File`, `Buffer`, or base64 directly.
 *
 * - `embedded` — data URL carried in memory through one POST (Phase 4).
 * - `reference` — id of temporary server-side storage (Phase 5, if the
 *   chosen real provider requires it).
 */
export type TryOnImageAccess =
  | { kind: "embedded"; dataUrl: string }
  | { kind: "reference"; refId: string };

export type TryOnImageInput = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  source: TryOnPhotoSource;
  access: TryOnImageAccess;
};

/** Metadata about the selected product, as the try-on flow needs it. */
export type TryOnProductInfo = {
  id: string;
  name: string;
  imageUrl: string | null;
  tryOnAssetUrl: string | null;
  /** Catalogue category slug when known (e.g. "mens-shirts"). */
  category?: string | null;
};

/** Domain error codes. Never exposed as stack traces, only as codes + messages. */
export type TryOnErrorCode =
  | "missing-product"
  | "invalid-product"
  | "missing-photo"
  | "invalid-photo"
  | "invalid-request"
  | "provider-not-configured"
  | "provider-failed"
  | "session-unavailable"
  | "unexpected";

export type TryOnErrorInfo = {
  code: TryOnErrorCode;
  message: string;
  /** True when the customer can retry the same request without changes. */
  retryable: boolean;
};

/** Standardized success result from the try-on service. */
export type TryOnResultSuccess = {
  status: "completed";
  resultImageUrl: string;
  providerName: string;
  /** "demo" when the output is simulated (labelled accordingly in the UI). */
  providerMode: "demo" | "real";
  providerRequestId: string;
  processingMs: number;
  requestId: string;
  product: { id: string; name: string };
  completedAt: string;
};

/** Wire shape for `POST /api/try-on`. */
export type TryOnApiResponse =
  | { success: true; result: TryOnResultSuccess }
  | { success: false; error: TryOnErrorInfo };