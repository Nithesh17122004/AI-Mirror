// Tests for the self-hosted VTON provider (Phase 5B).
// The inference server is ALWAYS mocked (global.fetch) — no real requests.
// Run with: npm test

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SelfHostedVirtualTryOnProvider,
  mapCategoryToVton,
} from "../lib/try-on/providers/self-hosted";
import { TryOnError } from "../lib/try-on/errors";
import { getTryOnProvider } from "../lib/try-on/providers";
import type { VirtualTryOnInput } from "../lib/try-on/providers/types";

const minimalInput: VirtualTryOnInput = {
  customerImage: {
    name: "me.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    source: "upload",
    access: { kind: "embedded", dataUrl: "data:image/jpeg;base64,AAAA" },
  },
  product: {
    id: "prd_1",
    name: "Blue Linen Shirt",
    imageUrl: "/products/blue-linen-formal-shirt.svg",
    tryOnAssetUrl: "/products/try-on/blue-linen-formal-shirt.svg",
    category: "mens-shirts",
  },
  requestId: "req_1",
};

type FetchMock = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

function installFetch(
  handler: (input: string | URL | Request, init?: RequestInit) => unknown
): void {
  globalThis.fetch = (async (...args: Parameters<FetchMock>) =>
    handler(...args)) as FetchMock;
}

function jsonResponse(
  body: unknown,
  status = 200,
  contentType = "application/json"
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": contentType },
  });
}

function withProvider<T>(
  vars: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }
  return fn().finally(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

const env = {
  VTON_SERVER_URL: "http://127.0.0.1:8060",
  VTON_SERVER_API_KEY: "test-secret",
};

describe("SelfHostedVirtualTryOnProvider", () => {
  test("reports name, mode=real", () => {
    const provider = new SelfHostedVirtualTryOnProvider();
    assert.equal(provider.name, "self-hosted");
    assert.equal(provider.mode, "real");
  });

  test("throws provider-not-configured when VTON_SERVER_URL is missing", async () => {
    const provider = new SelfHostedVirtualTryOnProvider();
    await withProvider(
      { VTON_SERVER_URL: "", VTON_SERVER_API_KEY: "test-secret" },
      async () => {
        await assert.rejects(
          () => provider.generateTryOn(minimalInput),
          (error: unknown) =>
            error instanceof Error &&
            error.message.includes("VTON_SERVER_URL")
        );
      }
    );
  });

  test("throws invalid-photo when the customer image is not embedded", async () => {
    const provider = new SelfHostedVirtualTryOnProvider();
    const input: VirtualTryOnInput = {
      ...minimalInput,
      customerImage: {
        name: "me.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        source: "upload",
        access: { kind: "reference", refId: "staged_1" },
      },
    };
    await withProvider(env, async () => {
      await assert.rejects(
        () => provider.generateTryOn(input),
        (error: unknown) =>
          error instanceof Error && error.message.includes("new photo")
      );
    });
  });

  test("submits a job, polls, and returns the completed result", async () => {
    const calls: { url: string; init?: { method?: string; headers?: Record<string, string>; body?: string } }[] = [];
    installFetch((input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      const shim: typeof calls[number]["init"] = init
        ? {
            method: init.method,
            body: typeof init.body === "string" ? init.body : undefined,
            headers: (init.headers as Record<string, string>) ?? {},
          }
        : undefined;
      calls.push({ url, init: shim });
      if (url.endsWith("/try-on")) {
        return jsonResponse({ job_id: "job_123" }, 202);
      }
      if (url.includes("/try-on/job_123")) {
        return jsonResponse({ status: "completed", result_image_url: "http://127.0.0.1:8060/results/job_123.png" });
      }
      return jsonResponse({ status: "processing" });
    });

    const provider = new SelfHostedVirtualTryOnProvider();
    const result = await withProvider(env, () =>
      provider.generateTryOn(minimalInput)
    );
    assert.equal(result.status, "success");
    if (result.status === "success") {
      assert.equal(result.providerRequestId, "job_123");
      assert.equal(result.resultImageUrl, "http://127.0.0.1:8060/results/job_123.png");
      assert.ok(result.processingMs >= 0);
    }

    // Verify transport: auth bearer, JSON content type, and body shape.
    const submit = calls.find((c) => c.url.endsWith("/try-on"));
    assert.ok(submit?.init);
    assert.equal(submit.init.method, "POST");
    assert.equal(submit.init.headers?.["Authorization"], "Bearer test-secret");
    assert.equal(
      submit.init.headers?.["Content-Type"],
      "application/json"
    );
    const body = JSON.parse(String(submit.init.body)) as {
      person_image: string;
      garment_image: string;
      category: string;
    };
    assert.equal(body.person_image, "data:image/jpeg;base64,AAAA");
    assert.equal(
      body.garment_image,
      minimalInput.product.tryOnAssetUrl
    );
    assert.equal(body.category, "tops"); // mens-shirts -> tops
  });

  test("omits Authorization when no API key is configured", async () => {
    let usedAuth = false;
    installFetch((input, init) => {
      if (String(input).endsWith("/try-on")) {
        usedAuth = !!((init?.headers as Record<string, string> | undefined)?.["Authorization"]);
        return jsonResponse({ job_id: "job_x" }, 202);
      }
      return jsonResponse({ status: "completed", result_image_url: "http://r/out.png" }, 200);
    });
    const provider = new SelfHostedVirtualTryOnProvider();
    await withProvider(
      { VTON_SERVER_URL: "http://127.0.0.1:8060", VTON_SERVER_API_KEY: "" },
      () => provider.generateTryOn(minimalInput)
    );
    assert.equal(usedAuth, false);
  });

  test("maps HTTP 401 to provider-not-configured", async () => {
    installFetch(() =>
      jsonResponse({ detail: "invalid token" }, 401)
    );
    const provider = new SelfHostedVirtualTryOnProvider();
    await withProvider(env, async () => {
      await assert.rejects(
        () => provider.generateTryOn(minimalInput),
        (error: unknown) =>
          error instanceof Error &&
          error.message.includes("not properly configured")
      );
    });
  });

  test("maps HTTP 400 to invalid-product", async () => {
    installFetch(() =>
      jsonResponse({ detail: "malformed" }, 400)
    );
    const provider = new SelfHostedVirtualTryOnProvider();
    await withProvider(env, async () => {
      await assert.rejects(
        () => provider.generateTryOn(minimalInput),
        (error: unknown) =>
          error instanceof Error && error.message.includes("malformed")
      );
    });
  });

  test("maps HTTP 429 to a retryable provider failure", async () => {
    installFetch(() => jsonResponse({ detail: "busy" }, 429));
    const provider = new SelfHostedVirtualTryOnProvider();
    await withProvider(env, async () => {
      await assert.rejects(
        () => provider.generateTryOn(minimalInput),
        (error: unknown) =>
          error instanceof Error && error.message.includes("busy")
      );
    });
  });

  test("maps HTTP 500 to a generic provider failure", async () => {
    installFetch(() => jsonResponse({ detail: "boom" }, 500));
    const provider = new SelfHostedVirtualTryOnProvider();
    await withProvider(env, async () => {
      await assert.rejects(
        () => provider.generateTryOn(minimalInput),
        (error: unknown) =>
          error instanceof Error && error.message.includes("virtual try-on service")
      );
    });
  });

  test("maps network failure to session-unavailable", async () => {
    installFetch(() => {
      throw new Error("fetch failed");
    });
    const provider = new SelfHostedVirtualTryOnProvider();
    await withProvider(env, async () => {
      await assert.rejects(
        () => provider.generateTryOn(minimalInput),
        (error: unknown) =>
          error instanceof Error &&
          error.message.includes("couldn't reach the virtual try-on service")
      );
    });
  });

  test("maps an aborted request (timeout) to a provider failure", async () => {
    installFetch(() => {
      throw new Error("The operation was aborted");
    });
    const provider = new SelfHostedVirtualTryOnProvider();
    await withProvider(env, async () => {
      await assert.rejects(
        () => provider.generateTryOn(minimalInput),
        (error: unknown) =>
          error instanceof Error && error.message.includes("timed out")
      );
    });
  });

  test("throws provider-failed when the response is missing a job ID", async () => {
    installFetch(() => jsonResponse({ ok: true }, 202));
    const provider = new SelfHostedVirtualTryOnProvider();
    await withProvider(env, async () => {
      await assert.rejects(
        () => provider.generateTryOn(minimalInput),
        (error: unknown) =>
          error instanceof Error && error.message.includes("missing job ID")
      );
    });
  });

  test("fails the job when the server reports failed status", async () => {
    let polled = false;
    installFetch((input) => {
      if (String(input).endsWith("/try-on")) {
        return jsonResponse({ job_id: "job_fail" }, 202);
      }
      polled = true;
      return jsonResponse(
        { status: "failed", error_message: "model error" },
        200
      );
    });
    const provider = new SelfHostedVirtualTryOnProvider();
    await withProvider(env, async () => {
      await assert.rejects(
        () => provider.generateTryOn(minimalInput),
        (error: unknown) => error instanceof Error && error.message === "model error"
      );
    });
    assert.equal(polled, true);
  });

  test("throws provider-failed when the completed job has no result image", async () => {
    installFetch((input) => {
      if (String(input).endsWith("/try-on")) {
        return jsonResponse({ job_id: "job_noimg" }, 202);
      }
      return jsonResponse({ status: "completed" }, 200);
    });
    const provider = new SelfHostedVirtualTryOnProvider();
    await withProvider(env, async () => {
      await assert.rejects(
        () => provider.generateTryOn(minimalInput),
        (error: unknown) =>
          error instanceof Error &&
          error.message.includes("did not return a result image")
      );
    });
  });
});

describe("mapCategoryToVton", () => {
  test("maps known catalogue categories", () => {
    assert.equal(mapCategoryToVton("mens-shirts"), "tops");
    assert.equal(mapCategoryToVton("mens-tshirts"), "tops");
    assert.equal(mapCategoryToVton("womens-kurtas"), "tops");
    assert.equal(mapCategoryToVton("jeans"), "bottoms");
    assert.equal(mapCategoryToVton("womens-dresses"), "one-pieces");
    assert.equal(mapCategoryToVton("sarees"), "one-pieces");
  });

  test("rejects unknown/missing categories with an explicit unsupported-category error", () => {
    assert.throws(
      () => mapCategoryToVton(undefined),
      (error: unknown) =>
        error instanceof TryOnError && error.code === "unsupported-category"
    );
    assert.throws(
      () => mapCategoryToVton(null),
      (error: unknown) =>
        error instanceof TryOnError && error.code === "unsupported-category"
    );
    assert.throws(
      () => mapCategoryToVton("accessories"),
      (error: unknown) =>
        error instanceof TryOnError && error.code === "unsupported-category"
    );
  });
});

describe("provider selection (registry)", () => {
  test("resolves self-hosted from TRY_ON_PROVIDER", () => {
    return withProvider(
      { TRY_ON_PROVIDER: "self-hosted" },
      async () => {
        assert.equal(getTryOnProvider().name, "self-hosted");
        assert.equal(getTryOnProvider().mode, "real");
      }
    );
  });

  test("resolves fashn (and legacy real) from TRY_ON_PROVIDER", () => {
    return withProvider({ TRY_ON_PROVIDER: "fashn" }, async () => {
      assert.equal(getTryOnProvider().name, "real");
    }).then(() =>
      withProvider({ TRY_ON_PROVIDER: "real" }, async () => {
        assert.equal(getTryOnProvider().name, "real");
      })
    );
  });

  test("defaults to mock when unset or unknown", () => {
    return withProvider({ TRY_ON_PROVIDER: "unknown" }, async () => {
      assert.equal(getTryOnProvider().name, "mock");
      assert.equal(getTryOnProvider().mode, "demo");
    }).then(() =>
      withProvider({ TRY_ON_PROVIDER: "" }, async () => {
        assert.equal(getTryOnProvider().name, "mock");
      })
    );
  });
});