import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AdminError } from "./errors";

export type TaxonomyKind = "category" | "collection";
type Input = { name: string; slug: string };

const LABEL: Record<TaxonomyKind, string> = { category: "category", collection: "collection" };

function rethrow(e: unknown, kind: TaxonomyKind): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    throw new AdminError(`Another ${LABEL[kind]} already uses that slug.`, { slug: "Already in use" });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
    throw new AdminError(`This ${LABEL[kind]} no longer exists.`);
  }
  throw e;
}

export async function listTaxonomy() {
  const [categories, collections] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, _count: { select: { products: true } } } }),
    prisma.collection.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, _count: { select: { products: true } } } }),
  ]);
  const shape = (r: (typeof categories)[number]) => ({ id: r.id, name: r.name, slug: r.slug, productCount: r._count.products });
  return { categories: categories.map(shape), collections: collections.map(shape) };
}

export async function createTaxonomy(kind: TaxonomyKind, data: Input) {
  try {
    return kind === "category"
      ? await prisma.category.create({ data, select: { id: true } })
      : await prisma.collection.create({ data, select: { id: true } });
  } catch (e) {
    rethrow(e, kind);
  }
}

export async function updateTaxonomy(kind: TaxonomyKind, id: string, data: Input) {
  try {
    if (kind === "category") await prisma.category.update({ where: { id }, data });
    else await prisma.collection.update({ where: { id }, data });
  } catch (e) {
    rethrow(e, kind);
  }
}

/**
 * Categories are required on products, so one in use can't be deleted (the FK is RESTRICT too).
 * Collections are optional: deleting one just un-assigns its products (FK SET NULL).
 */
export async function deleteTaxonomy(kind: TaxonomyKind, id: string) {
  try {
    if (kind === "category") {
      const inUse = await prisma.product.count({ where: { categoryId: id } });
      if (inUse > 0) {
        throw new AdminError(`This category has ${inUse} ${inUse === 1 ? "product" : "products"}. Move them to another category first.`);
      }
      await prisma.category.delete({ where: { id } });
      return { unassigned: 0 };
    }
    const unassigned = await prisma.product.count({ where: { collectionId: id } });
    await prisma.collection.delete({ where: { id } });
    return { unassigned };
  } catch (e) {
    if (e instanceof AdminError) throw e;
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      throw new AdminError("This category still has products. Move them to another category first.");
    }
    rethrow(e, kind);
  }
}
