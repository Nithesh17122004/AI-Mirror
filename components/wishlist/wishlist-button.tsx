"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/lib/wishlist/store";
import { cn } from "@/lib/utils";

/**
 * Guest wishlist toggle. Saves/removes the product ID in browser storage only.
 * Never prompts for an account.
 */
export function WishlistButton({
  productId,
  variant = "outline",
  size = "lg",
  className,
  showLabel = true,
}: {
  productId: string;
  variant?: "default" | "gold" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}) {
  const { ids, count, toggle } = useWishlist();
  const saved = ids.includes(productId);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => toggle(productId)}
      aria-pressed={saved}
      className={cn(className)}
    >
      <Heart
        aria-hidden="true"
        className={cn(saved && "fill-rosewood-600 text-rosewood-600")}
      />
      {showLabel && (
        <>
          {saved ? "Saved" : "Add to Wishlist"}
          {saved && count > 0 && (
            <span className="sr-only">, {count} item{count === 1 ? "" : "s"} saved</span>
          )}
        </>
      )}
    </Button>
  );
}