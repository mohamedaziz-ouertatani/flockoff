import "server-only";
import { Prisma } from "@prisma/client";
import { AdminError } from "./errors";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import type { ProductData } from "@/lib/validation/admin";

function isUniqueViolation(e: unknown, field: string) {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    JSON.stringify(e.meta?.target ?? "").includes(field)
  );
}

export async function listAdminProducts(q: string) {
  const term = q.trim();
  return prisma.product.findMany({
    where: term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { slug: { contains: term, mode: "insensitive" } },
            { category: { name: { contains: term, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      isActive: true,
      isFeatured: true,
      category: { select: { name: true } },
      collection: { select: { name: true } },
      images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
      variants: { select: { size: true, stock: true }, orderBy: { size: "asc" } },
    },
  });
}

export async function getAdminProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      description: true,
      categoryId: true,
      collectionId: true,
      isActive: true,
      isFeatured: true,
      images: { select: { id: true, url: true, position: true }, orderBy: { position: "asc" } },
      variants: { select: { size: true, stock: true }, orderBy: { size: "asc" } },
    },
  });
}

function productFields(d: ProductData) {
  return {
    name: d.name,
    slug: d.slug,
    price: d.price,
    categoryId: d.categoryId,
    collectionId: d.collectionId,
    description: d.description,
    isFeatured: d.isFeatured,
    isActive: d.isActive,
  };
}

function rethrowSlug(e: unknown): never {
  if (isUniqueViolation(e, "slug")) {
    throw new AdminError("That slug is already used by another product.", { slug: "Already in use" });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
    throw new AdminError("The selected category or collection no longer exists.");
  }
  throw e;
}

export async function createProduct(d: ProductData) {
  try {
    return await prisma.product.create({
      data: {
        ...productFields(d),
        variants: { create: d.variants.map((v) => ({ size: v.size, stock: v.stock })) },
      },
      select: { id: true },
    });
  } catch (e) {
    rethrowSlug(e);
  }
}

/**
 * Stock edits are compare-and-set: a size only updates if its stock is still what the admin
 * saw. If a checkout sold a unit meanwhile, we refuse rather than silently overwrite it.
 */
export async function updateProduct(id: string, d: ProductData) {
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({ where: { id }, data: productFields(d) });
      if (updated.count === 0) throw new AdminError("This product no longer exists.");

      const conflicts: string[] = [];
      for (const v of d.variants) {
        if (v.expectedStock === null) {
          const exists = await tx.variant.findUnique({ where: { productId_size: { productId: id, size: v.size } } });
          if (exists) conflicts.push(v.size);
          else await tx.variant.create({ data: { productId: id, size: v.size, stock: v.stock } });
        } else {
          const { count } = await tx.variant.updateMany({
            where: { productId: id, size: v.size, stock: v.expectedStock },
            data: { stock: v.stock },
          });
          if (count === 0) conflicts.push(v.size);
        }
      }
      if (conflicts.length > 0) {
        throw new AdminError(
          `Stock for ${conflicts.join(", ")} changed while you were editing (probably a sale). Reload the page to see current stock, then try again.`,
        );
      }

      // Sizes removed in the form. Past order items keep their snapshots (variantId -> null).
      await tx.variant.deleteMany({ where: { productId: id, size: { notIn: d.variants.map((v) => v.size) } } });
    });
  } catch (e) {
    rethrowSlug(e);
  }
}

export async function deleteProduct(id: string) {
  const images = await prisma.productImage.findMany({ where: { productId: id }, select: { url: true } });
  const { count } = await prisma.product.deleteMany({ where: { id } });
  if (count === 0) throw new AdminError("This product no longer exists.");
  // Files go only after the rows are gone, so a failed delete never leaves broken images.
  const storage = getStorage();
  await Promise.all(images.map((i) => storage.delete(i.url)));
}

// ---- Images -------------------------------------------------------------------------------

export async function addProductImage(productId: string, url: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new AdminError("This product no longer exists.");
    const last = await tx.productImage.aggregate({ where: { productId }, _max: { position: true } });
    return tx.productImage.create({
      data: { productId, url, position: (last._max.position ?? -1) + 1 },
      select: { id: true, url: true, position: true },
    });
  });
}

export async function deleteProductImage(imageId: string) {
  const image = await prisma.$transaction(async (tx) => {
    const img = await tx.productImage.findUnique({ where: { id: imageId } });
    if (!img) throw new AdminError("Image already removed.");
    await tx.productImage.delete({ where: { id: imageId } });
    // Re-number so positions stay 0..n-1 with no gaps.
    const rest = await tx.productImage.findMany({ where: { productId: img.productId }, orderBy: { position: "asc" } });
    for (const [i, r] of rest.entries()) {
      if (r.position !== i) await tx.productImage.update({ where: { id: r.id }, data: { position: i } });
    }
    return img;
  });
  await getStorage().delete(image.url);
}

export async function moveProductImage(imageId: string, direction: "up" | "down") {
  await prisma.$transaction(async (tx) => {
    const img = await tx.productImage.findUnique({ where: { id: imageId } });
    if (!img) throw new AdminError("Image not found.");
    const neighbour = await tx.productImage.findFirst({
      where: {
        productId: img.productId,
        position: direction === "up" ? { lt: img.position } : { gt: img.position },
      },
      orderBy: { position: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbour) return;
    await tx.productImage.update({ where: { id: img.id }, data: { position: neighbour.position } });
    await tx.productImage.update({ where: { id: neighbour.id }, data: { position: img.position } });
  });
}
