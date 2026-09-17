import { z } from "zod";

export const genderSchema = z.enum(["MEN", "WOMEN", "UNISEX"]);

export const availabilitySchema = z.enum(["in-stock", "limited", "unavailable"]);

export const sortSchema = z.enum([
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
]);

export type SortValue = z.infer<typeof sortSchema>;

/** Validate + normalise the /products search params. */
export const catalogueParamsSchema = z.object({
  search: z.string().trim().max(80).optional(),
  category: z.string().trim().max(40).optional(),
  gender: genderSchema.optional(),
  colour: z.string().trim().max(40).optional(),
  size: z.string().trim().max(8).optional(),
  minPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
  availability: availabilitySchema.optional(),
  sort: sortSchema.optional(),
});

export type CatalogueParams = z.infer<typeof catalogueParamsSchema>;

/**
 * Validate a product id or slug for the detail route.
 * Accepts cuids and slugs; anything else is rejected so the
 * page can serve a 404 instead of querying garbage.
 */
export function isValidProductLookup(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 100 &&
    /^[a-zA-Z0-9-_]+$/.test(value)
  );
}