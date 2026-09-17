// Try-on service — the single entry point the API route (and future callers)
// use to generate a try-on. It validates input, resolves the product, runs the
// configured provider, and persists a session — without knowing anything about
// which provider implementation is behind the interface.
//
// Architecture:
//   Browser -> POST /api/try-on -> TryOnService -> VirtualTryOnProvider
//   TryOnService -> TryOnSessionStore (best-effort persistence)

import { randomUUID } from "node:crypto";
import { getTryOnProvider } from "./providers";
import type { VirtualTryOnProvider } from "./providers/types";
import { prismaTryOnSessionStore, type TryOnSessionStore } from "./session-store";
import { errors, toTryOnError } from "./errors";
import {
  ACCEPTED_PHOTO_MIME_TYPES,
  MAX_PHOTO_SIZE_BYTES,
} from "@/lib/try-on/validation";
import type {
  TryOnImageInput,
  TryOnProductInfo,
  TryOnResultSuccess,
} from "./types";

export type TryOnServiceOptions = {
  /** Override the configured provider (tests, future callers). */
  provider?: VirtualTryOnProvider;
  /**
   * Resolve a product for validation. Defaults to a lazy import of the
   * catalogue's `getProductById`, mapped to provider-friendly metadata.
   */
  loadProduct?: (id: string) => Promise<TryOnProductInfo | null>;
  /** Persistence for try-on sessions. Defaults to the Prisma store. */
  sessionStore?: TryOnSessionStore;
};

export type TryOnServiceInput = {
  productId: string;
  image: TryOnImageInput;
};

export type GenerateTryOnResult = TryOnResultSuccess;

function isEmbeddedImage(image: TryOnImageInput): image is TryOnImageInput & {
  access: { kind: "embedded"; dataUrl: string };
} {
  return image.access.kind === "embedded";
}

async function defaultLoadProduct(
  id: string
): Promise<TryOnProductInfo | null> {
  const { getProductById } = await import("@/lib/products/queries");
  const product = await getProductById(id);
  if (!product) return null;
  return {
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    tryOnAssetUrl: product.tryOnAssetUrl,
    category: product.categorySlug ?? null,
  };
}

export class TryOnService {
  private readonly provider: VirtualTryOnProvider;
  private readonly loadProduct: NonNullable<TryOnServiceOptions["loadProduct"]>;
  private readonly sessionStore: TryOnSessionStore;

  constructor(options: TryOnServiceOptions = {}) {
    this.provider = options.provider ?? getTryOnProvider();
    this.loadProduct = options.loadProduct ?? defaultLoadProduct;
    this.sessionStore = options.sessionStore ?? prismaTryOnSessionStore;
  }

  /**
   * Generate a virtual try-on. Throws `TryOnError` for every failure mode;
   * the API route converts them into the standard JSON error shape.
   */
  async generate(input: TryOnServiceInput): Promise<GenerateTryOnResult> {
    // 1. Basic presence checks (defence in depth — the route validates too).
    if (!input.productId || !input.productId.trim()) throw errors.missingProduct();
    if (!input.image) throw errors.missingPhoto();

    // 2. Image validation — size, MIME type, and embedded payload sanity.
    this.assertValidImage(input.image);

    // 3. Resolve the product.
    let product: TryOnProductInfo | null;
    try {
      product = await this.loadProduct(input.productId);
    } catch {
      throw errors.unexpected(
        "We couldn't load that product right now. Please try again."
      );
    }
    if (!product) throw errors.invalidProduct();

    const requestId = randomUUID();

    // 4. Persist the session (best effort — never blocks the result).
    const session = await this.sessionStore.create({
      productId: product.id,
      requestId,
      providerName: this.provider.name,
      imageInfo: {
        name: input.image.name,
        sizeBytes: input.image.sizeBytes,
        source: input.image.source,
      },
    });
    const sessionId = session?.id;

    if (sessionId) await this.sessionStore.markProcessing(sessionId);

    // 5. Ask the provider. All provider behaviour stays behind the interface.
    let providerResult;
    try {
      providerResult = await this.provider.generateTryOn({
        customerImage: input.image,
        product,
        requestId,
        sessionId,
      });
    } catch (error) {
      const normalized = toTryOnError(error);
      if (sessionId)
        await this.sessionStore.fail(sessionId, {
          code: normalized.code,
          message: normalized.message,
        });
      throw normalized;
    }

    if (providerResult.status === "failed") {
      if (sessionId)
        await this.sessionStore.fail(sessionId, {
          code: "provider-failed",
          message: providerResult.message,
        });
      throw errors.providerFailed(providerResult.message);
    }

    if (sessionId)
      await this.sessionStore.complete(sessionId, {
        resultImageUrl: providerResult.resultImageUrl,
        providerRequestId: providerResult.providerRequestId,
        processingMs: providerResult.processingMs,
      });

    return {
      status: "completed",
      resultImageUrl: providerResult.resultImageUrl,
      providerName: this.provider.name,
      providerMode: this.provider.mode,
      providerRequestId: providerResult.providerRequestId,
      processingMs: providerResult.processingMs,
      requestId: sessionId ?? requestId,
      product: { id: product.id, name: product.name },
      completedAt: new Date().toISOString(),
    };
  }

  private assertValidImage(image: TryOnImageInput): void {
    if (!isEmbeddedImage(image)) {
      throw errors.invalidPhoto(
        "We couldn't use that photo. Please try another one."
      );
    }
    if (
      typeof image.sizeBytes !== "number" ||
      image.sizeBytes <= 0 ||
      image.sizeBytes > MAX_PHOTO_SIZE_BYTES
    ) {
      throw errors.invalidPhoto(
        "Your image is larger than 10 MB. Please choose a smaller image."
      );
    }
    if (
      !(ACCEPTED_PHOTO_MIME_TYPES as readonly string[]).includes(image.mimeType)
    ) {
      throw errors.invalidPhoto("Please upload a JPG, PNG, or WEBP image.");
    }
    const dataUrl = image.access.dataUrl;
    if (
      typeof dataUrl !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl) ||
      dataUrl.length > MAX_PHOTO_SIZE_BYTES * 2 // base64 inflation guard
    ) {
      throw errors.invalidPhoto(
        "That image could not be loaded. Please try another photo."
      );
    }
  }
}