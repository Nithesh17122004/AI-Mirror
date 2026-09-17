"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TryOnApiResponse, TryOnPhase, TryOnResultSuccess } from "@/lib/try-on/types";

/** Short client-side delay so "Preparing your photo..." is visible before
 *  the request kicks off — mirrors the service's prepare stage. */
const PREPARE_VISIBLE_MS = 650;

export type TryOnGeneratorProps = {
  product: { id: string; name: string } | null;
  photo: { file: File; previewUrl: string } | null;
  /** Return the user to choosing a photo (no full page refresh). */
  onChooseDifferentPhoto: () => void;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("read-failed"));
    };
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function TryOnGenerator({
  product,
  photo,
  onChooseDifferentPhoto,
}: TryOnGeneratorProps) {
  const [phase, setPhase] = useState<TryOnPhase>("idle");
  const [result, setResult] = useState<TryOnResultSuccess | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const hasProduct = !!product;
  const hasPhoto = !!photo;

  const generate = useCallback(async () => {
    // Duplicate-request prevention.
    if (inFlightRef.current) return;
    if (!hasProduct) {
      setPhase("failed");
      setErrorMessage("Please select a product first.");
      return;
    }
    if (!hasPhoto) {
      setPhase("failed");
      setErrorMessage("Please add a photo first.");
      return;
    }

    inFlightRef.current = true;
    setPhase("preparing");
    setErrorMessage(null);
    setResult(null);

    try {
      const dataUrl = await fileToDataUrl(photo.file);
      // Keep the "Preparing your photo..." state visible for a beat before
      // "Creating your virtual try-on..." while the request is in flight.
      await wait(PREPARE_VISIBLE_MS);
      setPhase("processing");

      const response = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          image: {
            name: photo.file.name,
            mimeType: photo.file.type,
            sizeBytes: photo.file.size,
            source: "upload",
            dataUrl,
          },
        }),
      });

      let payload: TryOnApiResponse | null = null;
      try {
        payload = (await response.json()) as TryOnApiResponse;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        setPhase("failed");
        setErrorMessage(
          payload && !payload.success
            ? payload.error.message
            : "We couldn't prepare your preview. Please try again."
        );
        return;
      }

      if (!payload?.success) {
        setPhase("failed");
        setErrorMessage("We couldn't prepare your preview. Please try again.");
        return;
      }

      setResult(payload.result);
      setPhase("completed");
    } catch (error) {
      const isReadError = error instanceof Error && error.message === "read-failed";
      setPhase("failed");
      setErrorMessage(
        isReadError
          ? "That image could not be loaded. Please try another photo."
          : "We couldn't reach the try-on service. Please try again."
      );
    } finally {
      inFlightRef.current = false;
    }
  }, [hasProduct, hasPhoto, product, photo]);

  const retry = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setErrorMessage(null);
  }, []);

  const busy = phase === "preparing" || phase === "processing";

  // ---- Idle -------------------------------------------------------------
  if (phase === "idle") {
    return (
      <div className="overflow-hidden rounded-2xl border border-brass-500/30 bg-ivory-50">
        <div className="px-5 pt-5 sm:px-6">
          <Badge>Ready for try-on</Badge>
          <h3 className="mt-3 font-display text-2xl text-espresso-900">
            Photo ready for virtual try-on.
          </h3>
          <p className="mt-2 text-[15px] leading-7 text-espresso-500">
            {hasProduct && hasPhoto ? (
              <>
                Generate a preview of{" "}
                <span className="font-semibold text-espresso-700">
                  {product.name}
                </span>{" "}
                with your photo. This phase uses the demo provider — no AI
                processing happens and nothing is uploaded beyond this
                request.
              </>
            ) : hasProduct ? (
              "Please add a photo first."
            ) : (
              "Please select a product first."
            )}
          </p>
        </div>
        <div className="px-5 pt-4 sm:px-6">
          <div className="overflow-hidden rounded-xl border border-espresso-900/10 bg-espresso-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo?.previewUrl ?? ""}
              alt={photo ? `Confirmed photo of ${photo.file.name}` : ""}
              className={`mx-auto max-h-[280px] w-full object-contain ${photo ? "" : "invisible"}`}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2.5 px-5 py-5 sm:flex-row sm:px-6">
          <Button
            type="button"
            variant="gold"
            size="lg"
            onClick={generate}
            disabled={!hasProduct || !hasPhoto}
            aria-label="Generate virtual try-on preview"
            className="min-h-13 flex-1 text-base"
          >
            <Sparkles aria-hidden="true" />
            Generate Try-On
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onChooseDifferentPhoto}
            className="min-h-13 flex-1"
          >
            Try Another Photo
          </Button>
          {hasProduct && (
            <Button asChild variant="ghost" size="lg" className="min-h-13 flex-1">
              <Link href={`/products/${product.id}`}>
                View product details
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ---- Preparing / processing -------------------------------------------
  if (busy) {
    const isProcessing = phase === "processing";
    return (
      <div
        role="status"
        aria-live="polite"
        className="overflow-hidden rounded-2xl border border-brass-500/30 bg-ivory-50"
      >
        <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <Loader2
            className="h-10 w-10 animate-spin text-brass-600"
            aria-hidden="true"
          />
          <div>
            <p className="font-display text-xl text-espresso-900">
              {isProcessing
                ? "Creating your look…"
                : "Preparing your virtual try-on…"}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-espresso-500">
              {isProcessing
                ? "Your photo and the selected product are being paired in the demo provider."
                : "Validating your photo and setting up the try-on session."}
            </p>
          </div>
          <p className="text-xs text-espresso-500">
            Usually takes a few seconds. This is a mock provider — no AI is
            running.
          </p>
        </div>
      </div>
    );
  }

  // ---- Failed ------------------------------------------------------------
  if (phase === "failed") {
    return (
      <div
        role="alert"
        className="overflow-hidden rounded-2xl border border-rosewood-600/25 bg-ivory-50"
      >
        <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rosewood-600/10 text-rosewood-600">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-xl text-espresso-900">
              We couldn&apos;t prepare the preview.
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-espresso-500">
              {errorMessage ?? "Please try again."}
            </p>
          </div>
          <Button
            type="button"
            variant="gold"
            size="lg"
            onClick={retry}
            aria-label="Try generating again"
            className="min-h-13"
          >
            <RefreshCw aria-hidden="true" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ---- Completed ---------------------------------------------------------
  const demo = result?.providerMode === "demo";
  return (
    <div className="overflow-hidden rounded-2xl border border-brass-500/30 bg-ivory-50">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brass-600">
          Your Virtual Try-On
        </p>
        {demo && <Badge>Demo Preview</Badge>}
      </div>

      <div className="px-5 pt-4 sm:px-6">
        <div className="relative overflow-hidden rounded-xl border border-espresso-900/10 bg-espresso-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result?.resultImageUrl ?? ""}
            alt="Demo preview of the selected garment"
            className="mx-auto max-h-[420px] w-full object-contain sm:max-h-[500px]"
          />
          {demo && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-3">
              <span className="rounded-full bg-espresso-900/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brass-200 backdrop-blur">
                AI Try-On Preview — Demo
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pt-4 sm:px-6">
        <h3 className="font-display text-2xl text-espresso-900">
          {result?.product.name ?? product?.name}
        </h3>
        <p className="mt-1 text-[13px] leading-6 text-espresso-500">
          {demo ? (
            <>
              This is a <span className="font-semibold text-espresso-700">demo preview</span> —
              the mock provider returned the product&apos;s demo asset. It is{" "}
              <span className="font-semibold text-espresso-700">not</span> a photo of you
              wearing the garment, and no AI was used.
            </>
          ) : (
            "Your virtual try-on preview."
          )}
        </p>
        {result && (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-espresso-500">
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-brass-600" aria-hidden="true" />
              Provider: {result.providerName}
            </span>
            <span aria-hidden="true">·</span>
            <span>Generated in {formatMs(result.processingMs)}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5 px-5 py-5 sm:flex-row sm:px-6">
        <Button asChild variant="gold" size="lg" className="min-h-13 flex-1">
          <Link href="/products">
            Try Another Product
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onChooseDifferentPhoto}
          className="min-h-13 flex-1"
        >
          Try Another Photo
        </Button>
      </div>
    </div>
  );
}