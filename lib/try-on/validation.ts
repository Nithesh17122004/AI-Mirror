// Pure, DOM-free validation for customer try-on photos.
// Safe to import from server or client code. Image readability
// (decoding) is checked separately in `components/try-on/photo-file.ts`
// because it needs browser image APIs.

/** Maximum accepted photo size: 10 MB. */
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

/** MIME types we accept. Checked alongside the file extension — never trust one alone. */
export const ACCEPTED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AcceptedPhotoMime = (typeof ACCEPTED_PHOTO_MIME_TYPES)[number];

/** File extensions we accept (lowercase, with leading dot). */
export const ACCEPTED_PHOTO_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

/** Value for the file input `accept` attribute. */
export const PHOTO_INPUT_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export type PhotoValidationErrorCode =
  | "too-large"
  | "unsupported-type"
  | "empty"
  | "unreadable";

export type PhotoValidationResult =
  | { ok: true }
  | { ok: false; code: PhotoValidationErrorCode; message: string };

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return "";
  return fileName.slice(dot).toLowerCase();
}

/**
 * Validate a candidate photo's metadata (size, MIME type, extension).
 * Readability (can the bytes actually decode as an image?) is verified
 * separately after this passes.
 */
export function validatePhotoFileMeta(file: {
  name: string;
  size: number;
  type: string;
}): PhotoValidationResult {
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return {
      ok: false,
      code: "too-large",
      message:
        "Your image is larger than 10 MB. Please choose a smaller image.",
    };
  }

  if (file.size <= 0) {
    return {
      ok: false,
      code: "empty",
      message: "That image could not be loaded. Please try another photo.",
    };
  }

  const mimeOk =
    file.type !== "" &&
    (ACCEPTED_PHOTO_MIME_TYPES as readonly string[]).includes(
      file.type.toLowerCase()
    );
  const extensionOk = (
    ACCEPTED_PHOTO_EXTENSIONS as readonly string[]
  ).includes(extensionOf(file.name));

  if (!mimeOk || !extensionOk) {
    return {
      ok: false,
      code: "unsupported-type",
      message: "Please upload a JPG, PNG, or WEBP image.",
    };
  }

  return { ok: true };
}

/** Friendly message when a file passes metadata checks but won't decode. */
export const UNREADABLE_PHOTO_MESSAGE =
  "That image could not be loaded. Please try another photo.";
