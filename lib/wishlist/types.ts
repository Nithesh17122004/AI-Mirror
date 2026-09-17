import type { Availability } from "@/lib/products/format";

/** Guest wishlist / recently-viewed candidate, with real data from the catalogue. */
export type WishlistProduct = {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  brandSlug: string;
  priceInr: number;
  salePriceInr: number | null;
  imageUrl: string | null;
  categorySlug: string;
  categoryName: string;
  colours: { name: string }[];
  colourNames: string[];
  availableSizes: string[];
  availability: Availability;
};

export type ScoredRecommendation = {
  product: WishlistProduct;
  score: number;
};

export type WishlistApiResult = {
  products: WishlistProduct[];
  /** ids that did NOT resolve to an ACTIVE product (client prunes these). */
  missing: string[];
  recentlyViewed: WishlistProduct[];
  missingRecent: string[];
  recommendations: ScoredRecommendation[];
};

export type WishlistApiResponse =
  | { success: true; result: WishlistApiResult }
  | {
      success: false;
      error: { code: string; message: string; retryable: boolean };
    };