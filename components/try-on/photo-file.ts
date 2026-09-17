// Browser-only helpers for turning a File into a verified preview.
// Imported only from client components — never from server code.

import {
  UNREADABLE_PHOTO_MESSAGE,
  validatePhotoFileMeta,
} from "@/lib/try-on/validation";

export type VerifiedPhoto = {
  file: File;
  previewUrl: string;
};

export type PhotoVerifyError = {
  code: string;
  message: string;
};

/**
 * Decode a blob off the main thread where supported, falling back to
 * an `<img>` element. Resolves true only when the bytes decode as an image.
 */
export function canDecodeImage(blob: Blob): Promise<boolean> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob)
      .then((bitmap) => {
        bitmap.close();
        return true;
      })
      .catch(() => false);
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}

/**
 * Validate metadata, verify the bytes decode as an image, then mint a
 * preview object URL. The caller owns `previewUrl` and must revoke it
 * via `revokePreviewUrl` when the photo is replaced or removed.
 */
export async function verifyPhotoFile(
  file: File
): Promise<
  { ok: true; photo: VerifiedPhoto } | { ok: false; error: PhotoVerifyError }
> {
  const meta = validatePhotoFileMeta(file);
  if (!meta.ok) {
    return { ok: false, error: { code: meta.code, message: meta.message } };
  }
  const decodable = await canDecodeImage(file);
  if (!decodable) {
    return {
      ok: false,
      error: { code: "unreadable", message: UNREADABLE_PHOTO_MESSAGE },
    };
  }
  return { ok: true, photo: { file, previewUrl: URL.createObjectURL(file) } };
}

export function revokePreviewUrl(previewUrl: string | null): void {
  if (previewUrl) {
    try {
      URL.revokeObjectURL(previewUrl);
    } catch {
      // Already revoked — safe to ignore.
    }
  }
}
