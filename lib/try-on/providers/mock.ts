// Mock virtual try-on provider (Phase 4).
//
// Simulates a realistic request flow (request -> processing -> result) with a
// short artificial delay so the UI can demonstrate the preparing/processing
// states. It does NOT generate any image: it returns the selected product's
// existing demo try-on asset, which the UI clearly labels "Demo Preview" so it
// is never mistaken for a real photo of the customer.
//
// This is the only provider registered in Phase 4. Swap it out in `index.ts`
// when a real provider is added in Phase 5.

import { randomUUID } from "node:crypto";
import {
  errors,
} from "../errors";
import type {
  VirtualTryOnInput,
  VirtualTryOnProvider,
  VirtualTryOnProviderResult,
} from "./types";

const DEFAULT_PREPARE_DELAY_MS = 450;
const DEFAULT_GENERATE_DELAY_MS = 1600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type MockVirtualTryOnProviderOptions = {
  /** Delays are injectable so tests can run fast and deterministically. */
  prepareDelayMs?: number;
  generateDelayMs?: number;
  /** When true, always fail — used to demo/verify the failure path. */
  fail?: boolean;
};

export class MockVirtualTryOnProvider implements VirtualTryOnProvider {
  readonly name = "mock";
  readonly mode = "demo" as const;

  private readonly prepareDelayMs: number;
  private readonly generateDelayMs: number;
  private readonly fail: boolean;

  constructor(options: MockVirtualTryOnProviderOptions = {}) {
    this.prepareDelayMs = options.prepareDelayMs ?? DEFAULT_PREPARE_DELAY_MS;
    this.generateDelayMs = options.generateDelayMs ?? DEFAULT_GENERATE_DELAY_MS;
    this.fail = options.fail ?? false;
  }

  async generateTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnProviderResult> {
    // Stage 1 — pre-processing (simulated upload/staging).
    await delay(this.prepareDelayMs);

    if (this.fail) {
      return {
        status: "failed",
        retryable: true,
        message: "The demo provider hit a simulated error.",
      };
    }

    // Stage 2 — generation (simulated). Real providers would send the image
    // to their endpoint here and await the result.
    await delay(this.generateDelayMs);

    // Phase 4 mock: no AI. Reuse the product's demo try-on asset (labelled
    // "Demo Preview" in the UI) instead of fabricating a customer image.
    const resultImageUrl =
      input.product.tryOnAssetUrl ?? input.product.imageUrl;

    if (!resultImageUrl) {
      throw errors.providerFailed(
        "The demo preview has no image to show. Please pick another product."
      );
    }

    return {
      status: "success",
      resultImageUrl,
      providerRequestId: randomUUID(),
      processingMs: this.prepareDelayMs + this.generateDelayMs,
    };
  }
}