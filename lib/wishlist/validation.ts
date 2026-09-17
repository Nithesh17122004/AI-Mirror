import { z } from "zod";
import { RECENTLY_VIEWED_MAX_IDS, WISHLIST_MAX_IDS } from "@/lib/wishlist/storage";

/**
 * Shared request contract for the wishlist resolve endpoint.
 * Only product identifiers are ever accepted — never personal data.
 */
export const wishlistResolveSchema = z.object({
  productIds: z.array(z.string().trim().min(1).max(100)).max(WISHLIST_MAX_IDS).default([]),
  recentlyViewedIds: z
    .array(z.string().trim().min(1).max(100))
    .max(RECENTLY_VIEWED_MAX_IDS)
    .default([]),
});

export type WishlistResolveInput = z.infer<typeof wishlistResolveSchema>;