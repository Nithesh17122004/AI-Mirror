// Provider contract for virtual try-on generation (Phase 4).
// The rest of the application talks to `VirtualTryOnProvider` — never to a
// specific vendor. Adding a real provider later means implementing this
// interface in `providers/<real>.ts` and registering it in `index.ts`.

import type { TryOnImageInput } from "../types";

/** The product a provider needs to know about — nothing more. */
export type VirtualTryOnProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  tryOnAssetUrl: string | null;
  /**
   * Catalogue category slug when known (e.g. "mens-shirts"). The
   * self-hosted provider maps it to the model's garment category
   * (tops / bottoms / one-pieces). Optional so existing callers and
   * tests keep working unchanged.
   */
  category?: string | null;
};

/** Exactly what a provider needs to generate a try-on. */
export type VirtualTryOnInput = {
  customerImage: TryOnImageInput;
  product: VirtualTryOnProduct;
  /** Server-assigned id for this try-on job (mirrors the DB session id). */
  requestId: string;
  /** Session id when persistence is available, otherwise undefined. */
  sessionId?: string;
};

export type VirtualTryOnProviderResult =
  | {
      status: "success";
      /** URL for the generated result. May be a local demo asset for mocks. */
      resultImageUrl: string;
      providerRequestId: string;
      /** Wall-clock time spent generating (ms). */
      processingMs: number;
    }
  | {
      status: "failed";
      retryable: boolean;
      message: string;
    };

/**
 * A virtual try-on generation provider.
 *
 * Implementations contain ALL provider-specific behaviour (request shape,
 * retries, auth, vendor API calls). The UI and service only depend on this
 * interface, so swapping mock -> real never touches the frontend.
 */
export interface VirtualTryOnProvider {
  /** Stable identifier, e.g. "mock" or "openai-gpt-image". */
  readonly name: string;
  /** Whether this provider performs real AI generation or simulates it. */
  readonly mode: "demo" | "real";
  /** Generate a try-on. Throw `TryOnError` for domain failures. */
  generateTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnProviderResult>;
}