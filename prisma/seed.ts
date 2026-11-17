import { PrismaClient, type Size } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TND = (n: number) => n * 1000; // millimes

const collections = [
  { name: "Winter 2023", slug: "winter-2023" },
  { name: "1st Anniversary", slug: "1st-anniversary" },
  { name: "FLOCK OFF MIX", slug: "flock-off-mix" },
] as const;

const categories = [
  { name: "Hoodie", slug: "hoodie" },
  { name: "T-shirt", slug: "t-shirt" },
  { name: "Jersey", slug: "jersey" },
  { name: "Pants", slug: "pants" },
] as const;

type CategorySlug = (typeof categories)[number]["slug"];
type CollectionSlug = (typeof collections)[number]["slug"];

type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: CategorySlug;
  collection?: CollectionSlug;
  isFeatured?: boolean;
  colors: [bg: string, fg: string][]; // one placeholder image per color pair
};

const products: SeedProduct[] = [
  {
    name: "Flock Off Essential Hoodie – Black",
    slug: "flock-off-essential-hoodie-black",
    description: "Heavyweight brushed-fleece hoodie with a tonal Flock Off chest print. Relaxed fit, ribbed cuffs.",
    price: TND(180),
    category: "hoodie",
    collection: "winter-2023",
    isFeatured: true,
    colors: [["171717", "f5f5f5"], ["262626", "f5f5f5"]],
  },
  {
    name: "Flock Off Essential Hoodie – Bone",
    slug: "flock-off-essential-hoodie-bone",
    description: "The everyday essential in an off-white bone colorway. 400 gsm fleece, double-lined hood.",
    price: TND(180),
    category: "hoodie",
    collection: "winter-2023",
    colors: [["e8e2d4", "1a1a1a"]],
  },
  {
    name: "Night Flight Zip Hoodie",
    slug: "night-flight-zip-hoodie",
    description: "Full-zip hoodie with a reflective flight-path print across the back. Built for late nights.",
    price: TND(210),
    category: "hoodie",
    collection: "winter-2023",
    isFeatured: true,
    colors: [["1e2a3a", "e5e7eb"], ["111827", "e5e7eb"]],
  },
  {
    name: "Migration Tee – Bone",
    slug: "migration-tee-bone",
    description: "Boxy-fit cotton tee with the Migration flock graphic. 240 gsm, garment-dyed.",
    price: TND(75),
    category: "t-shirt",
    collection: "flock-off-mix",
    isFeatured: true,
    colors: [["e8e2d4", "1a1a1a"]],
  },
  {
    name: "Migration Tee – Black",
    slug: "migration-tee-black",
    description: "The Migration graphic tee in washed black. Boxy fit, dropped shoulders.",
    price: TND(75),
    category: "t-shirt",
    collection: "flock-off-mix",
    colors: [["1c1c1c", "e8e2d4"]],
  },
  {
    name: "Anniversary Logo Tee",
    slug: "anniversary-logo-tee",
    description: "Celebrating our 1st Anniversary: oversized tee with the commemorative one-year logo.",
    price: TND(85),
    category: "t-shirt",
    collection: "1st-anniversary",
    isFeatured: true,
    colors: [["f4f4f0", "7c2d12"]],
  },
  {
    name: "Medina Street Tee",
    slug: "medina-street-tee",
    description: "Lightweight tee inspired by the alleys of the Medina. Small front print, large back print.",
    price: TND(70),
    category: "t-shirt",
    colors: [["c2410c", "fff7ed"]],
  },
  {
    name: "Flock Logo Jersey",
    slug: "flock-logo-jersey",
    description: "Mesh football-style jersey with a stitched Flock logo crest and printed number 23.",
    price: TND(120),
    category: "jersey",
    collection: "flock-off-mix",
    isFeatured: true,
    colors: [["14532d", "f0fdf4"], ["f0fdf4", "14532d"]],
  },
  {
    name: "Anniversary Jersey – Limited",
    slug: "anniversary-jersey-limited",
    description: "Limited 1st Anniversary jersey with woven badge and anniversary number 01.",
    price: TND(140),
    category: "jersey",
    collection: "1st-anniversary",
    colors: [["7f1d1d", "fef2f2"]],
  },
  {
    name: "Coastline Jersey",
    slug: "coastline-jersey",
    description: "Breathable jersey in Mediterranean blue with white sleeve stripes.",
    price: TND(115),
    category: "jersey",
    colors: [["1d4ed8", "eff6ff"]],
  },
  {
    name: "Flight Cargo Pants",
    slug: "flight-cargo-pants",
    description: "Relaxed cargo pants with six pockets and adjustable ankle toggles.",
    price: TND(160),
    category: "pants",
    collection: "winter-2023",
    colors: [["57534e", "fafaf9"]],
  },
  {
    name: "Flock Off Sweatpants – Grey",
    slug: "flock-off-sweatpants-grey",
    description: "Matching fleece sweatpants with embroidered Flock Off hip logo and elastic cuffs.",
    price: TND(130),
    category: "pants",
    collection: "flock-off-mix",
    colors: [["9ca3af", "111827"]],
  },
];

const SIZES: Size[] = ["S", "M", "L", "XL"];

// Deterministic "random" stock between 5 and 20 so re-seeding gives stable data.
function stockFor(productIndex: number, sizeIndex: number) {
  const x = Math.sin(productIndex * 31 + sizeIndex * 7 + 1) * 10000;
  return 5 + Math.floor((x - Math.floor(x)) * 16);
}

function placeholderUrl(name: string, [bg, fg]: [string, string]) {
  return `/placeholder/${encodeURIComponent(name)}?bg=${bg}&fg=${fg}`;
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env");
  }
  if (password.length < 8) throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    // A new password also ends this admin's existing sessions (see the jwt callback in auth.ts).
    update: { passwordHash, role: "ADMIN", sessionVersion: { increment: 1 } },
    create: {
      email,
      passwordHash,
      role: "ADMIN",
      firstName: process.env.SEED_ADMIN_FIRST_NAME ?? "Flock",
      lastName: process.env.SEED_ADMIN_LAST_NAME ?? "Admin",
    },
  });
  console.log(`  admin: ${email}`);
}

/**
 * `--admin-only`: create/update the admin and nothing else (production).
 * Demo data upserts the demo products and RESETS their stock, so it's refused on a non-local
 * database unless `--with-demo` is passed explicitly (e.g. for a staging/demo site).
 */
function isLocalDatabase(url = process.env.DATABASE_URL ?? "") {
  try {
    return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const adminOnly = args.has("--admin-only");
  // Checked before writing anything, so a refused run changes nothing.
  if (!adminOnly && !isLocalDatabase() && !args.has("--with-demo")) {
    throw new Error(
      "Refusing to load demo products into a non-local database: it would reset their stock. " +
        "Use `pnpm db:create-admin` for production, or pass --with-demo for a demo/staging site.",
    );
  }
  console.log(adminOnly ? "Creating the FLOCK OFF admin…" : "Seeding FLOCK OFF…");
  await seedAdmin();
  if (adminOnly) {
    console.log("Done (admin only, no demo data).");
    return;
  }

  const collectionIds = new Map<string, string>();
  for (const c of collections) {
    const row = await prisma.collection.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
    collectionIds.set(c.slug, row.id);
  }
  console.log(`  collections: ${collections.length}`);

  const categoryIds = new Map<string, string>();
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
    categoryIds.set(c.slug, row.id);
  }
  console.log(`  categories: ${categories.length}`);

  for (const [i, p] of products.entries()) {
    const data = {
      name: p.name,
      description: p.description,
      price: p.price,
      categoryId: categoryIds.get(p.category)!,
      collectionId: p.collection ? collectionIds.get(p.collection)! : null,
      isFeatured: p.isFeatured ?? false,
      isActive: true,
    };

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.upsert({
        where: { slug: p.slug },
        update: data,
        create: { ...data, slug: p.slug },
      });

      await tx.productImage.deleteMany({ where: { productId: product.id } });
      await tx.productImage.createMany({
        data: p.colors.map((colors, position) => ({
          productId: product.id,
          url: placeholderUrl(p.name, colors),
          position,
        })),
      });

      for (const [s, size] of SIZES.entries()) {
        const stock = stockFor(i, s);
        await tx.variant.upsert({
          where: { productId_size: { productId: product.id, size } },
          update: { stock },
          create: { productId: product.id, size, stock },
        });
      }
    });
  }
  console.log(`  products: ${products.length} (sizes ${SIZES.join("/")}, stock 5–20)`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
