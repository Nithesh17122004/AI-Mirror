import { Check, Info } from "lucide-react";

const TIPS = [
  "Stand facing the camera",
  "Keep your whole body visible",
  "Use good lighting",
  "Avoid heavily obstructed clothing",
  "Keep the background reasonably clear",
] as const;

/** Pre-upload guidance for a full-body try-on photo. */
export function PhotoGuidelines() {
  return (
    <div className="rounded-2xl border border-espresso-900/10 bg-ivory-100 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass-100 text-brass-700"
          aria-hidden="true"
        >
          <Info className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-espresso-900">
            Use a clear, well-lit full-body photo.
          </p>
          <p className="mt-1 text-[13px] leading-6 text-espresso-500">
            A good photo helps the future try-on preview line garments up
            with you. These tips prepare your photo — they don&apos;t promise
            a perfect result.
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {TIPS.map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-[13px] text-espresso-700">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-brass-600"
              aria-hidden="true"
            />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
