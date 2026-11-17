import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ShopFilters } from "@/lib/validation/catalog";

export const SHOP_PAGE_SIZE = 12;

// Everything a product card needs, and nothing more.
const cardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
  variants: { select: { stock: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  categoryName: string;
  imageUrl: string | null;
  soldOut: boolean;
};

function toCard(p: CardRow): ProductCardData {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    categoryName: p.category.name,
    imageUrl: p.images[0]?.url ?? null,
    soldOut: p.variants.every((v) => v.stock <= 0),
  };
}

/** Cached per request: the header nav and pages both need these. */
export const getCollections = cache(() =>
  prisma.collection.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
);

export const getCategories = cache(() =>
  prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
);

/** Each collection with one representative product image (featured first) for hero/tiles. */
export async function getCollectionShowcase() {
  const rows = await prisma.collection.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: { where: { isActive: true } } } },
      products: {
        where: { isActive: true },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { name: true, images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 } },
      },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c._count.products,
    coverName: c.products[0]?.name ?? c.name,
    coverUrl: c.products[0]?.images[0]?.url ?? null,
  }));
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

export async function getNewArrivals(limit = 4): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

function orderByFor(sort: ShopFilters["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" }, { createdAt: "desc" }];
    case "price-desc":
      return [{ price: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }, { name: "asc" }];
  }
}

export async function listProducts(filters: ShopFilters) {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(filters.category && { category: { slug: filters.category } }),
    ...(filters.collection && { collection: { slug: filters.collection } }),
    ...((filters.min !== undefined || filters.max !== undefined) && {
      price: {
        ...(filters.min !== undefined && { gte: filters.min }),
        ...(filters.max !== undefined && { lte: filters.max }),
      },
    }),
  };

  const total = await prisma.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const page = Math.min(filters.page ?? 1, pageCount);

  const rows = await prisma.product.findMany({
    where,
    orderBy: orderByFor(filters.sort),
    skip: (page - 1) * SHOP_PAGE_SIZE,
    take: SHOP_PAGE_SIZE,
    select: cardSelect,
  });

  return { items: rows.map(toCard), total, page, pageCount };
}

/** Price bounds of active products, for the filter inputs' placeholders. */
export async function getPriceBounds() {
  const agg = await prisma.product.aggregate({
    where: { isActive: true },
    _min: { price: true },
    _max: { price: true },
  });
  return { min: agg._min.price ?? 0, max: agg._max.price ?? 0 };
}

/**
 * Every word must match the product name or its category name (case-insensitive),
 * so "black hoodie" finds "Flock Off Essential Hoodie – Black".
 */
export async function searchProducts(query: string, limit = 48): Promise<ProductCardData[]> {
  const terms = query.split(/\s+/).filter(Boolean).slice(0, 8);
  if (terms.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      AND: terms.map((term) => ({
        OR: [
          { name: { contains: term, mode: "insensitive" as const } },
          { category: { name: { contains: term, mode: "insensitive" as const } } },
        ],
      })),
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

export const getProductBySlug = cache(async (slug: string) => {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      price: true,
      category: { select: { name: true, slug: true } },
      collection: { select: { name: true, slug: true } },
      images: { select: { id: true, url: true }, orderBy: { position: "asc" } },
      // Enum columns sort in declaration order: XS, S, M, L, XL, XXL.
      variants: { select: { id: true, size: true, stock: true }, orderBy: { size: "asc" } },
    },
  });
});

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

/** Current price/stock/availability for cart lines, so a stale localStorage cart can be refreshed. */
export async function getVariantSnapshots(variantIds: string[]) {
  if (variantIds.length === 0) return [];
  const rows = await prisma.variant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      size: true,
      stock: true,
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          price: true,
          isActive: true,
          images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
        },
      },
    },
  });
  return rows.map((v) => ({
    variantId: v.id,
    productId: v.product.id,
    slug: v.product.slug,
    name: v.product.name,
    size: v.size,
    unitPrice: v.product.price,
    imageUrl: v.product.images[0]?.url ?? null,
    stock: v.stock,
    active: v.product.isActive,
  }));
}

export async function getRelatedProducts(productId: string, categorySlug: string, limit = 4) {
  const rows = await prisma.product.findMany({
    where: { isActive: true, id: { not: productId }, category: { slug: categorySlug } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}
