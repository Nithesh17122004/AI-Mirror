// Reusable customer-photo state for the try-on flow.
// Owns the selected File (original preserved, never compressed),
// its object-URL preview, lifecycle status, and friendly errors.
//
// Errors are orthogonal to status (shown as an alert banner) so a
// failed upload never destroys an already-accepted photo. Nothing here
// touches the network, localStorage, or cookies — the photo lives only
// in memory for the current page session.

import { useCallback, useEffect, useRef, useState } from "react";
import { revokePreviewUrl, verifyPhotoFile } from "./photo-file";
import type {
  PhotoError,
  PhotoSource,
  PhotoStatus,
} from "./photo-types";

export type UseCustomerPhoto = {
  status: PhotoStatus;
  file: File | null;
  previewUrl: string | null;
  source: PhotoSource | null;
  error: PhotoError | null;
  /** Validate + decode a file from upload or camera. True when accepted. */
  acceptFile: (file: File, source: PhotoSource) => Promise<boolean>;
  openCamera: () => void;
  closeCamera: () => void;
  /** Move preview -> ready (Continue). Only valid from preview. */
  confirmPhoto: () => void;
  /** Revoke the preview URL and return to idle (Remove / start over). */
  resetPhoto: () => void;
  clearError: () => void;
};

export function useCustomerPhoto(): UseCustomerPhoto {
  const [status, setStatus] = useState<PhotoStatus>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [source, setSource] = useState<PhotoSource | null>(null);
  const [error, setError] = useState<PhotoError | null>(null);

  // Mirror of the live preview URL for unmount cleanup. Updated only
  // inside callbacks (never during render) alongside the state itself.
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      revokePreviewUrl(previewRef.current);
    };
  }, []);

  const acceptFile = useCallback(
    async (next: File, nextSource: PhotoSource): Promise<boolean> => {
      // Hold the camera status while a capture verifies so the
      // camera interface stays mounted; uploads use `reading`.
      setStatus(nextSource === "camera" ? "camera" : "reading");
      setError(null);
      const result = await verifyPhotoFile(next);
      if (result.ok) {
        setFile(result.photo.file);
        setPreviewUrl((prev) => {
          revokePreviewUrl(prev);
          return result.photo.previewUrl;
        });
        previewRef.current = result.photo.previewUrl;
        setSource(nextSource);
        setStatus("preview");
        return true;
      }
      // Keep any previously accepted photo; fall back to idle otherwise.
      // (When the camera modal is open it unmounts here, revealing the error.)
      setError({ code: result.error.code, message: result.error.message });
      setStatus(previewRef.current ? "preview" : "idle");
      return false;
    },
    []
  );

  const openCamera = useCallback(() => {
    setError(null);
    setStatus("camera");
  }, []);

  const closeCamera = useCallback(() => {
    setStatus(previewRef.current ? "preview" : "idle");
  }, []);

  const confirmPhoto = useCallback(() => {
    setStatus((prev) => {
      if (prev === "preview" && previewRef.current) return "ready";
      return prev;
    });
  }, []);

  const resetPhoto = useCallback(() => {
    setPreviewUrl((prev) => {
      revokePreviewUrl(prev);
      return null;
    });
    previewRef.current = null;
    setFile(null);
    setSource(null);
    setError(null);
    setStatus("idle");
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
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
  };
}
