"use client";

import { useEffect, useRef } from "react";
import { useRecentlyViewed } from "@/lib/wishlist/store";
import { trackEvent } from "@/lib/analytics/client";

/**
 * Records that a guest viewed a product while on the product detail page.
 * Stores the product ID only (newest first, capped) and fires the
 * non-sensitive `product_view` analytics event. No images, no user data.
 */
export function RecentlyViewedTracker({ productId }: { productId: string }) {
  const { noteViewed } = useRecentlyViewed();
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    noteViewed(productId);
    trackEvent.productView(productId);
  }, [productId, noteViewed]);

  return null;
}