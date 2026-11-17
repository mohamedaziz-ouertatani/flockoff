import { z } from "zod";
import { tndToMillimes } from "@/lib/money";
import { ORDER_STATUSES } from "@/lib/order-status";

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

// "Required" is checked before the format, so an empty slug says so instead of a regex message.
const slugField = (min: number) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .min(min, "Slug is required")
    .max(64, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only");

/** Admin types a price in TND ("180" or "179.900"); stored as integer millimes. */
const priceField = z
  .string()
  .trim()
  .transform((v, ctx) => {
    try {
      const m = tndToMillimes(v);
      if (m <= 0) throw new Error();
      if (m > 100_000_000) {
        ctx.addIssue({ code: "custom", message: "That price looks too high" });
        return z.NEVER;
      }
      return m;
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a price in TND, e.g. 180 or 179.900" });
      return z.NEVER;
    }
  });

export const variantInputSchema = z.object({
  size: z.enum(SIZES),
  stock: z.number().int("Whole numbers only").min(0, "Stock can't be negative").max(99_999),
  /** Stock the admin saw when the form loaded; null for a size being added. Detects concurrent sales. */
  expectedStock: z.number().int().min(0).nullable(),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: slugField(2),
  price: priceField,
  categoryId: z.string().trim().min(1, "Pick a category"),
  collectionId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  description: z.string().trim().min(1, "Description is required").max(4000),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  variants: z
    .array(variantInputSchema)
    .max(SIZES.length)
    .refine((v) => new Set(v.map((x) => x.size)).size === v.length, "Each size can only appear once"),
});

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductData = z.output<typeof productInputSchema>;
export type ProductField = keyof ProductData;

export const taxonomyInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  slug: slugField(1),
});
export type TaxonomyInput = z.input<typeof taxonomyInputSchema>;

export const orderStatusSchema = z.enum(ORDER_STATUSES);

export const idSchema = z.string().trim().min(1).max(40);
