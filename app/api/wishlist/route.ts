import { NextResponse } from "next/server";
import {
  recommendFromWishlist,
  resolveWishlistProducts,
} from "@/lib/wishlist/catalogue";
import { wishlistResolveSchema } from "@/lib/wishlist/validation";
import type { WishlistApiResponse } from "@/lib/wishlist/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse<WishlistApiResponse>> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "invalid-request",
          message: "Request body must be JSON.",
          retryable: false,
        },
      },
      { status: 400 }
    );
  }

  const parsed = wishlistResolveSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "invalid-request",
          message: "productIds must be a list of product identifiers.",
          retryable: false,
        },
      },
      { status: 400 }
    );
  }

  const { productIds, recentlyViewedIds } = parsed.data;
  try {
    const [resolved, recent] = await Promise.all([
      resolveWishlistProducts(productIds),
      resolveWishlistProducts(recentlyViewedIds),
    ]);

    // Personalisation is driven by the products that ACTUALLY resolved against
    // the catalogue — never by the untrusted stored ids alone.
    const recommendations = await recommendFromWishlist(resolved.products);

    return NextResponse.json({
      success: true as const,
      result: {
        products: resolved.products,
        missing: resolved.missing,
        recentlyViewed: recent.products,
        missingRecent: recent.missing,
        recommendations,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "catalogue-unavailable",
          message:
            "The product database wasn't reachable. Your saved items are still stored on this device — try again shortly.",
          retryable: true,
        },
      },
      { status: 503 }
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}