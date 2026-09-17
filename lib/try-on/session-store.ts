// Pluggable persistence for try-on sessions.
//
// Phase 4 must keep working when PostgreSQL is unavailable: the store swallows
// DB errors (logging only the code, never image data) and returns `null` /
// `undefined`, so the generation result still reaches the customer. Phase 5
// can swap a stricter store in if a provider requires it.

import { db } from "@/lib/db";
import type { TryOnErrorCode, TryOnImageInput } from "./types";

export type TryOnSessionSnapshot = {
  id: string;
  status: "CREATED" | "PROCESSING" | "READY" | "FAILED";
};

export type TryOnSessionStore = {
  /** Create a session. Resolves null when persistence isn't available. */
  create(input: {
    productId: string;
    requestId: string;
    providerName: string;
    imageInfo: Pick<TryOnImageInput, "name" | "sizeBytes" | "source">;
  }): Promise<TryOnSessionSnapshot | null>;
  markProcessing(sessionId: string): Promise<void>;
  complete(sessionId: string, details: {
    resultImageUrl: string;
    providerRequestId: string;
    processingMs: number;
  }): Promise<void>;
  fail(sessionId: string, details: { code: TryOnErrorCode; message: string }): Promise<void>;
};

const logFailure = (label: string) =>
  // No customer image data in logs — code + label only.
  console.error(`[try-on:session] ${label} — database unavailable`);

/** Best-effort store backed by the existing Prisma TryOnSession model. */
export const prismaTryOnSessionStore: TryOnSessionStore = {
  async create({ productId, requestId, providerName, imageInfo }) {
    try {
      const session = await db.tryOnSession.create({
        data: {
          status: "CREATED",
          productId,
          provider: providerName,
          providerRequestId: requestId,
          inputImageName: imageInfo.name,
          inputImageSource: imageInfo.source,
          inputImageUrl: null, // customer image is never persisted in Phase 4
        },
        select: { id: true },
      });
      return { id: session.id, status: "CREATED" };
    } catch {
      logFailure("create");
      return null;
    }
  },
  async markProcessing(sessionId) {
    try {
      await db.tryOnSession.update({
        where: { id: sessionId },
        data: { status: "PROCESSING" },
      });
    } catch {
      logFailure("markProcessing");
    }
  },
  async complete(sessionId, { resultImageUrl, providerRequestId, processingMs }) {
    try {
      await db.tryOnSession.update({
        where: { id: sessionId },
        data: {
          status: "READY",
          outputImageUrl: resultImageUrl,
          providerRequestId,
          processingMs,
        },
      });
    } catch {
      logFailure("complete");
    }
  },
  async fail(sessionId, { code, message }) {
    try {
      await db.tryOnSession.update({
        where: { id: sessionId },
        data: {
          status: "FAILED",
          errorCode: code,
          errorMessage: message,
        },
      });
    } catch {
      logFailure("fail");
    }
  },
};

/** Store that does nothing — used when no persistence is configured. */
export const noopTryOnSessionStore: TryOnSessionStore = {
  async create() {
    return null;
  },
  async markProcessing() {},
  async complete() {},
  async fail() {},
};