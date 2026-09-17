// Typed errors for the try-on service. Provider and service internals throw
// these; the API route maps them to clean JSON. No stack traces are exposed.

import type { TryOnErrorCode, TryOnErrorInfo } from "./types";

export class TryOnError extends Error {
  readonly code: TryOnErrorCode;
  readonly retryable: boolean;

  constructor(code: TryOnErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "TryOnError";
    this.code = code;
    this.retryable = retryable;
  }

  toInfo(): TryOnErrorInfo {
    return { code: this.code, message: this.message, retryable: this.retryable };
  }
}

/** Convenience constructors for the common failure modes. */
export const errors = {
  missingProduct: (message = "Please select a product first.") =>
    new TryOnError("missing-product", message, false),
  invalidProduct: (message = "We couldn't load that product. Please pick it again.") =>
    new TryOnError("invalid-product", message, false),
  missingPhoto: (message = "Please add a photo first.") =>
    new TryOnError("missing-photo", message, false),
  invalidPhoto: (message = "That photo couldn't be used. Please try another.") =>
    new TryOnError("invalid-photo", message, false),
  invalidRequest: (message = "The request was not valid. Please try again.") =>
    new TryOnError("invalid-request", message, false),
  providerNotConfigured: (message = "The virtual try-on provider isn't configured yet.") =>
    new TryOnError("provider-not-configured", message, false),
  providerFailed: (message = "The try-on preview failed to generate. Please try again.") =>
    new TryOnError("provider-failed", message, true),
  sessionUnavailable: (message = "We couldn't reach the session service. Your request stayed on this device.") =>
    new TryOnError("session-unavailable", message, true),
  unexpected: (message = "Something went wrong. Please try again.") =>
    new TryOnError("unexpected", message, true),
};

/**
 * Normalise anything thrown by a provider or the service into a TryOnError,
 * so the API route can return a consistent structure.
 */
export function toTryOnError(error: unknown): TryOnError {
  if (error instanceof TryOnError) return error;
  return errors.unexpected();
}