"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist/store";

/**
 * Header wishlist link with a live guest count. The count is read from local
 * storage only (product IDs) — never from an account.
 */
export function WishlistLink({
  className = "inline-flex h-10 w-10 items-center justify-center rounded-full text-espresso-900 transition-colors hover:bg-espresso-900/[0.06]",
}: {
  className?: string;
}) {
  const { count } = useWishlist();
  return (
    <Link
      href="/wishlist"
      aria-label={`Wishlist${count > 0 ? `, ${count} saved item${count === 1 ? "" : "s"}` : ""}`}
      className={`relative ${className}`}
    >
      <Heart className="h-[18px] w-[18px]" aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rosewood-600 px-1 text-[10px] font-bold text-ivory-50"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
      <span aria-live="polite" className="sr-only">
        {count} saved item{count === 1 ? "" : "s"}
      </span>
    </Link>
  );
}