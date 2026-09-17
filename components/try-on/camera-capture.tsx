"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Aperture,
  CameraOff,
  RefreshCw,
  SwitchCamera,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CameraPhase = "starting" | "live" | "blocked" | "unavailable" | "failed";

type FacingMode = "user" | "environment";

const CAPTURE_QUALITY = 0.92;

function friendlyStreamError(error: unknown): {
  phase: CameraPhase;
  message: string;
} {
  const name =
    error instanceof DOMException
      ? error.name
      : error instanceof Error
        ? error.name
        : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return {
      phase: "blocked",
      message: "Camera access is required to take a photo.",
    };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return {
      phase: "unavailable",
      message:
        "Camera isn't available on this device. You can upload a photo instead.",
    };
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return {
      phase: "failed",
      message:
        "Your camera seems to be busy in another app. Close it and try again, or upload a photo instead.",
    };
  }
  return {
    phase: "failed",
    message:
      "Something went wrong starting the camera. Please try again, or upload a photo instead.",
  };
}

function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Track already stopped — safe to ignore.
    }
  }
}

export type CameraCaptureProps = {
  /** Called with the captured JPEG. Resolve true when the photo is accepted. */
  onCapture: (file: File) => Promise<boolean>;
  onClose: () => void;
  /** Switch to the file-upload path (closes camera, opens the picker). */
  onUploadInstead: () => void;
};

/**
 * Mirror-style camera interface. Opens the device camera, captures a
 * single frame to a JPEG File, and always stops every MediaStreamTrack
 * afterwards — on capture, on close, on switch, and on unmount.
 */
export function CameraCapture({
  onCapture,
  onClose,
  onUploadInstead,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    (typeof window === "undefined" || window.isSecureContext);

  const [phase, setPhase] = useState<CameraPhase>(() =>
    supported ? "starting" : "unavailable"
  );
  const [message, setMessage] = useState<string | null>(() =>
    supported
      ? null
      : "Camera isn't available on this device or browser. You can upload a photo instead."
  );
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [canSwitch, setCanSwitch] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [useCaptureError, setUseCaptureError] = useState<string | null>(null);

  const startStream = useCallback(async (facing: FacingMode) => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setPhase("starting");
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: facing === "user" ? true : { facingMode: { ideal: facing } },
        audio: false,
      });
      if (!mountedRef.current) {
        stopStream(stream);
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // Autoplay can reject before metadata loads; the `autoPlay`
          // attribute retries once the stream is ready.
        }
      }
      // Only offer camera switching when the device truly has
      // more than one video input — never assume support.
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        if (mountedRef.current) setCanSwitch(videoInputs.length > 1);
      } catch {
        if (mountedRef.current) setCanSwitch(false);
      }
      if (mountedRef.current) setPhase("live");
    } catch (error) {
      if (!mountedRef.current) return;
      const friendly = friendlyStreamError(error);
      setPhase(friendly.phase);
      setMessage(friendly.message);
    }
  }, []);

  // Open the camera on mount; stop every track on unmount.
  // Subscribing to the camera is syncing with an external system, which is
  // what effects are for — the set-state-in-effect rule doesn't apply here.
  useEffect(() => {
    mountedRef.current = true;
    if (!supported) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void startStream("user");
    return () => {
      mountedRef.current = false;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [supported, startStream]);

  const handleClose = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    onClose();
  }, [onClose]);

  // Escape closes the camera. Lock background scroll while open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleClose]);

  const handleSwitch = useCallback(async () => {
    const next: FacingMode = facingMode === "user" ? "environment" : "user";
    try {
      setFacingMode(next);
      await startStream(next);
    } catch {
      // startStream already maps failures; restore the previous mode label
      // so the button stays truthful.
      if (mountedRef.current) {
        setFacingMode(facingMode);
        setPhase("failed");
        setMessage(
          "Couldn't switch cameras just now. You can keep using this camera or upload a photo instead."
        );
      }
    }
  }, [facingMode, startStream]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.readyState < 2) {
      setUseCaptureError(
        "The camera isn't ready yet. Hold on a moment and try again."
      );
      return;
    }
    setCapturing(true);
    setUseCaptureError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no-2d-context");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", CAPTURE_QUALITY)
      );
      if (!blob) throw new Error("capture-empty");
      const file = new File([blob], "iris-camera-photo.jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      // Never leave the camera running after capture.
      stopStream(streamRef.current);
      streamRef.current = null;
      const accepted = await onCapture(file);
      if (!accepted && mountedRef.current) {
        setCapturing(false);
        setUseCaptureError(
          "We couldn't use that photo. Please try capturing again."
        );
        // Re-open the stream so the customer can retry immediately.
        void startStream(facingMode);
      }
    } catch {
      if (mountedRef.current) {
        setCapturing(false);
        setUseCaptureError(
          "We couldn't capture that frame. Please try again."
        );
      }
    }
  }, [facingMode, onCapture, startStream]);

  const showVideo = phase === "live" || phase === "starting";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-espresso-900/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="iris-camera-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-brass-500/25 bg-espresso-900 text-ivory-50 shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brass-200">
              I-RIS Mirror
            </p>
            <h2
              id="iris-camera-title"
              className="mt-1 font-display text-2xl text-ivory-50"
            >
              Take your photo
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-ivory-50/70">
              Frame your full body, face the camera, and hold still.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="Close camera"
            className="shrink-0 text-ivory-50 hover:bg-ivory-50/10 hover:text-ivory-50"
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        <div className="px-5 pt-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-ivory-50/15 bg-espresso-700">
            {showVideo ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  disablePictureInPicture
                  aria-label="Live camera preview"
                  className={cn(
                    "aspect-[3/4] w-full object-cover",
                    phase === "starting" && "opacity-0"
                  )}
                />
                {phase === "starting" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-ivory-50/70">
                      Starting camera…
                    </p>
                  </div>
                )}
                {/* Subtle mirror frame — decorative only. */}
                <div
                  className="pointer-events-none absolute inset-4 rounded-xl border border-brass-200/40"
                  aria-hidden="true"
                />
              </>
            ) : (
              <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 px-6 text-center">
                <span
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-ivory-50/10 text-brass-200"
                  aria-hidden="true"
                >
                  <CameraOff className="h-7 w-7" />
                </span>
                <p className="max-w-xs text-sm leading-6 text-ivory-50/85">
                  {message ??
                    "Camera isn't available on this device. You can upload a photo instead."}
                </p>
                <Button
                  type="button"
                  variant="gold"
                  size="lg"
                  onClick={onUploadInstead}
                  className="mt-1 min-h-12"
                >
                  <Upload aria-hidden="true" />
                  {phase === "blocked"
                    ? "Upload a Photo Instead"
                    : "Upload a photo instead"}
                </Button>
              </div>
            )}
          </div>

          {useCaptureError && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-rosewood-600/25 px-4 py-2.5 text-[13px] leading-6 text-ivory-50"
            >
              {useCaptureError}
            </p>
          )}
        </div>

        {showVideo && (
          <div className="flex flex-col gap-2.5 px-5 py-5 sm:flex-row sm:px-6">
            <Button
              type="button"
              variant="gold"
              size="lg"
              onClick={handleCapture}
              disabled={phase !== "live" || capturing}
              autoFocus
              aria-label="Capture photo"
              className="min-h-13 flex-1 text-base"
            >
              <Aperture aria-hidden="true" />
              {capturing ? "Capturing…" : "Capture Photo"}
            </Button>
            <div className="flex gap-2.5">
              {canSwitch && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleSwitch}
                  disabled={phase !== "live" || capturing}
                  aria-label={`Switch to ${facingMode === "user" ? "rear" : "front"} camera`}
                  className="min-h-13 flex-1 border-ivory-50/25 text-ivory-50 hover:border-ivory-50/60 hover:bg-ivory-50/10 sm:flex-none"
                >
                  {facingMode === "user" ? (
                    <SwitchCamera aria-hidden="true" />
                  ) : (
                    <RefreshCw aria-hidden="true" />
                  )}
                  Switch
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleClose}
                className="min-h-13 flex-1 text-ivory-50 hover:bg-ivory-50/10 hover:text-ivory-50 sm:flex-none"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {(phase === "blocked" || phase === "failed") && showVideo === false && (
          <div className="px-5 pb-5 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="w-full text-ivory-50 hover:bg-ivory-50/10 hover:text-ivory-50"
            >
              Close
            </Button>
          </div>
        )}

        <p className="border-t border-ivory-50/10 px-5 py-3 text-center text-xs text-ivory-50/60 sm:px-6">
          Camera video is not recorded continuously — only the frame you
          capture is kept, on this device.
        </p>
      </div>
    </div>
  );
}
