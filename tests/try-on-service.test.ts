// Tests for the try-on service orchestration + request validation.
// Runs without a database: session persistence and product loading are
// injected, so PostgreSQL unavailability never blocks these tests.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TryOnService } from "../lib/try-on/service";
import { noopTryOnSessionStore } from "../lib/try-on/session-store";
import { MockVirtualTryOnProvider } from "../lib/try-on/providers/mock";
import type { VirtualTryOnProvider } from "../lib/try-on/providers/types";
import type {
  TryOnImageInput,
  TryOnProductInfo,
  TryOnResultSuccess,
} from "../lib/try-on/types";

const validImage: TryOnImageInput = {
  name: "me.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 2048,
  source: "upload",
  access: { kind: "embedded", dataUrl: "data:image/jpeg;base64,QUJDRA==" },
};

const product: TryOnProductInfo = {
  id: "prd_1",
  name: "Blue Linen Shirt",
  imageUrl: "/products/blue-linen-formal-shirt.svg",
  tryOnAssetUrl: "/products/try-on/blue-linen-formal-shirt.svg",
};

const loadProduct = async (id: string): Promise<TryOnProductInfo | null> =>
  id === product.id ? product : null;

const fastMockProvider = () =>
  new MockVirtualTryOnProvider({ prepareDelayMs: 0, generateDelayMs: 0 });

function service(overrides: {
  provider?: VirtualTryOnProvider;
  sessionStore?: typeof noopTryOnSessionStore;
  loader?: (id: string) => Promise<TryOnProductInfo | null>;
} = {}) {
  return new TryOnService({
    provider: overrides.provider ?? fastMockProvider(),
    sessionStore: overrides.sessionStore ?? noopTryOnSessionStore,
    loadProduct: overrides.loader ?? loadProduct,
  });
}

async function expectErrorCode(
  promise: Promise<unknown>,
  code: string
): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.equal(
      (error as { code?: string }).code,
      code,
      `expected error code ${code}`
    );
    return true;
  });
}

describe("TryOnService", () => {
  test("successfully generates with the mock provider", async () => {
    const result = (await service().generate({
      productId: product.id,
      image: validImage,
    })) as TryOnResultSuccess;

    assert.equal(result.status, "completed");
    assert.equal(result.product.id, product.id);
    assert.equal(result.resultImageUrl, product.tryOnAssetUrl);
    assert.equal(result.providerName, "mock");
    assert.equal(result.providerMode, "demo");
    assert.ok(result.requestId.length > 0);
    assert.ok(result.completedAt.length > 0);
  });

  test("rejects a missing product", async () => {
    await expectErrorCode(
      service().generate({ productId: "", image: validImage }),
      "missing-product"
    );
    await expectErrorCode(
      service().generate({ productId: "   ", image: validImage }),
      "missing-product"
    );
  });

  test("rejects a missing photo", async () => {
    await expectErrorCode(
      service().generate({ productId: product.id, image: undefined as unknown as TryOnImageInput }),
      "missing-photo"
    );
  });

  test("rejects an unknown product", async () => {
    await expectErrorCode(
      service().generate({ productId: "nope", image: validImage }),
      "invalid-product"
    );
  });

  test("rejects invalid image metadata", async () => {
    const tooBig = { ...validImage, sizeBytes: 11 * 1024 * 1024 };
    await expectErrorCode(
      service().generate({ productId: product.id, image: tooBig }),
      "invalid-photo"
    );

    const wrongMime = { ...validImage, mimeType: "image/gif" };
    await expectErrorCode(
      service().generate({ productId: product.id, image: wrongMime }),
      "invalid-photo"
    );

    const badDataUrl = {
      ...validImage,
      access: { kind: "embedded" as const, dataUrl: "/products/tee.svg" },
    };
    await expectErrorCode(
      service().generate({ productId: product.id, image: badDataUrl }),
      "invalid-photo"
    );

    const zeroBytes = { ...validImage, sizeBytes: 0 };
    await expectErrorCode(
      service().generate({ productId: product.id, image: zeroBytes }),
      "invalid-photo"
    );
  });

  test("maps provider failure to a retryable provider error", async () => {
    let calls = 0;
    const flakyProvider: VirtualTryOnProvider = {
      name: "flaky",
      mode: "demo",
      async generateTryOn() {
        calls += 1;
        return { status: "failed", retryable: true, message: "boom" };
      },
    };
    await expectErrorCode(
      service({ provider: flakyProvider }).generate({
        productId: product.id,
        image: validImage,
      }),
      "provider-failed"
    );
    assert.equal(calls, 1);
  });

  test("normalizes a thrown provider error", async () => {
    const throwingProvider: VirtualTryOnProvider = {
      name: "throwing",
      mode: "demo",
      async generateTryOn() {
        throw new Error("vendor exploded");
      },
    };
    await expectErrorCode(
      service({ provider: throwingProvider }).generate({
        productId: product.id,
        image: validImage,
      }),
      "unexpected"
    );
  });

  test("reports an unresolvable product as a retryable unexpected error", async () => {
    const loader = async (): Promise<TryOnProductInfo | null> => {
      throw new Error("db down");
    };
    await expectErrorCode(
      service({ loader }).generate({ productId: product.id, image: validImage }),
      "unexpected"
    );
  });
});