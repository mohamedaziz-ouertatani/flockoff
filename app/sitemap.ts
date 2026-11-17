import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/site";

// Built per request (cached by the CDN) so `next build` never needs a database connection.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const url = (path: string) => new URL(path, base).toString();
  const [products, collections] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
    prisma.collection.findMany({ select: { slug: true } }),
  ]);

  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/shop"), changeFrequency: "daily", priority: 0.9 },
    ...collections.map((c) => ({ url: url(`/shop?collection=${c.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: url(`/product/${p.slug}`), lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
