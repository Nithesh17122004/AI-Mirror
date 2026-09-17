"use client";

import { useCallback, useRef } from "react";
import { Camera, Lock, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHOTO_INPUT_ACCEPT } from "@/lib/try-on/validation";
import { CameraCapture } from "./camera-capture";
import { PhotoGuidelines } from "./photo-guidelines";
import { PhotoPreview } from "./photo-preview";
import { TryOnGenerator } from "./try-on-generator";
import { useCustomerPhoto } from "./use-customer-photo";

export type PhotoInputProps = {
  productId: string | null;
  productName: string | null;
};

/**
 * Customer photo input for virtual try-on (Phase 3).
 * Upload or camera capture, local preview, retake / remove / continue.
 * The photo never leaves the device: no uploads, no storage, no AI — yet.
 */
export function PhotoInput({ productId, productName }: PhotoInputProps) {
  const {
    status,
    file,
    previewUrl,
    source,
    error,
    acceptFile,
    openCamera,
    closeCamera,
    confirmPhoto,
    resetPhoto,
    clearError,
  } = useCustomerPhoto();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async () => {
    const input = fileInputRef.current;
    const chosen = input?.files?.[0];
    // Reset the input so the same file can be picked again (retake).
    if (input) input.value = "";
    if (!chosen) return;
    await acceptFile(chosen, "upload");
  }, [acceptFile]);

  const handleCameraCapture = useCallback(
    async (captured: File): Promise<boolean> => {
      const accepted = await acceptFile(captured, "camera");
      if (accepted) closeCamera();
      return accepted;
    },
    [acceptFile, closeCamera]
  );

  const handleUploadInstead = useCallback(() => {
    closeCamera();
    // Still inside the customer's click gesture, so the picker opens.
    fileInputRef.current?.click();
  }, [closeCamera]);

  const handleRetake = useCallback(() => {
    if (source === "camera") {
      openCamera();
    } else {
      fileInputRef.current?.click();
    }
  }, [source, openCamera]);

  const busy = status === "reading";
  const showEntry = status === "idle" || status === "reading";

  return (
    <section aria-labelledby="iris-photo-heading" className="mt-6">
      <h2
        id="iris-photo-heading"
        className="font-display text-2xl text-espresso-900 sm:text-3xl"
      >
        Your Photo
      </h2>
      <p className="mt-2 text-[15px] leading-7 text-espresso-500">
        Upload a full-body photo or use your camera
        {productName ? (
          <>
            {" "}to prepare <span className="font-semibold text-espresso-700">{productName}</span> for the
            mirror
          </>
        ) : (
          " to get ready for the mirror"
        )}
        . Your photo stays on this device — nothing is uploaded or processed
        in this phase.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-rosewood-600/25 bg-rosewood-600/[0.07] px-4 py-3"
        >
          <p className="text-sm leading-6 text-rosewood-700">{error.message}</p>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss error"
            className="shrink-0 rounded-full p-1 text-rosewood-600 hover:bg-rosewood-600/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {showEntry && (
        <div className="mt-5 space-y-4" aria-busy={busy}>
          <PhotoGuidelines />
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button
              type="button"
              variant="gold"
              size="lg"
              onClick={openPicker}
              disabled={busy}
              aria-label="Upload a full-body photo"
              className="min-h-14 flex-1 text-base"
            >
              <Upload aria-hidden="true" />
              {busy ? "Checking your photo…" : "Upload Photo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={openCamera}
              disabled={busy}
              aria-label="Use camera to take a photo"
              className="min-h-14 flex-1 text-base"
            >
              <Camera aria-hidden="true" />
              Use Camera
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={PHOTO_INPUT_ACCEPT}
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Upload a full-body photo"
            tabIndex={-1}
          />
          <p className="flex items-start gap-2 text-xs leading-5 text-espresso-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Your photo is used to provide the virtual try-on experience.
              JPG, PNG, or WEBP up to 10&nbsp;MB. Kept only for this page
              session — never stored or shared.
            </span>
          </p>
        </div>
      )}

      {status === "camera" && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={closeCamera}
          onUploadInstead={handleUploadInstead}
        />
      )}

      {status === "preview" && previewUrl && file && (
        <div className="mt-5">
          <PhotoPreview
            previewUrl={previewUrl}
            photoName={file.name}
            source={source}
            onRetake={handleRetake}
            onRemove={resetPhoto}
            onContinue={confirmPhoto}
          />
        </div>
      )}

      {status === "ready" && previewUrl && file && (
        <div className="mt-5">
          <TryOnGenerator
            product={productId ? { id: productId, name: productName ?? "Selected product" } : null}
            photo={{ file, previewUrl }}
            onChooseDifferentPhoto={resetPhoto}
          />
        </div>
      )}
    </section>
  );
}
