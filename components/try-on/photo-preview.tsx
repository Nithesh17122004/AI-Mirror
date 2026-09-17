import { ArrowRight, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PhotoSource } from "./photo-types";

export type PhotoPreviewProps = {
  previewUrl: string;
  photoName: string;
  source: PhotoSource | null;
  onRetake: () => void;
  onRemove: () => void;
  onContinue: () => void;
};

/** Large local preview with Retake / Remove / Continue actions. */
export function PhotoPreview({
  previewUrl,
  photoName,
  source,
  onRetake,
  onRemove,
  onContinue,
}: PhotoPreviewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-espresso-900/10 bg-ivory-50">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <Badge>Photo ready</Badge>
        <p className="text-xs text-espresso-500">
          {source === "camera" ? "Captured with your camera" : "Uploaded photo"}
        </p>
      </div>
      <div className="px-5 pt-3">
        <div className="overflow-hidden rounded-xl border border-espresso-900/10 bg-espresso-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`Preview of ${photoName}`}
            className="mx-auto max-h-[420px] w-full object-contain sm:max-h-[480px]"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2.5 px-5 py-5 sm:flex-row">
        <Button
          type="button"
          variant="gold"
          size="lg"
          onClick={onContinue}
          aria-label="Continue with this photo"
          className="min-h-13 flex-1 text-base"
        >
          Continue
          <ArrowRight aria-hidden="true" />
        </Button>
        <div className="flex gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onRetake}
            aria-label="Retake photo"
            className="min-h-12 flex-1 sm:flex-none"
          >
            <RefreshCw aria-hidden="true" />
            Retake
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onRemove}
            aria-label="Remove photo"
            className="min-h-12 flex-1 text-rosewood-600 hover:bg-rosewood-600/10 hover:text-rosewood-700 sm:flex-none"
          >
            <Trash2 aria-hidden="true" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
