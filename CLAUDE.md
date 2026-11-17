# FLOCK OFF — E-commerce Build Spec

FLOCK OFF is an independent streetwear brand from Tunis. This repo is its online store (customer shop and admin panel in one Next.js app). It revives an earlier MERN version that was lost.

## Stack
- **Next.js 15** (App Router, Server Components, Server Actions), **TypeScript** in strict mode
- **PostgreSQL** with **Prisma** as the ORM
- **Tailwind CSS** and **shadcn/ui**
- **Auth.js (NextAuth v5)**: email + password with credentials, roles `CUSTOMER` and `ADMIN`
- **Zod** for all input validation, shared between client and server
- **Zustand** for the cart (persisted to localStorage), validated on the server at checkout
- Image storage: **Cloudinary** or **UploadThing**, behind one `lib/storage.ts` interface
- Local dev: `docker-compose.yml` with Postgres. Package manager: pnpm

## Conventions
- **Currency is TND, stored as integer millimes** (1 TND = 1000 millimes). Never use floats for money. Format with one helper: `formatTND(millimes)` gives `180.000 TND`, or `180 TND` when it is a whole number.
- All mutations go through Server Actions that call Zod validation and then service functions in `lib/services/*`. No business logic in components.
- Any operation that touches stock and orders together runs in a `prisma.$transaction`.
- Admin routes live under `app/(admin)/admin/*`, protected by middleware with an `ADMIN` role check. The shop lives under `app/(shop)/*`.
- Commit after each phase.

## Data model (Prisma)
- **User**: id, firstName, lastName, email (unique), phone, passwordHash, role, createdAt
- **Address**: id, userId?, street, city, zip, country (default "Tunisia")
- **Collection**: id, name, slug (e.g. Winter 2023, 1st Anniversary, FLOCK OFF MIX)
- **Category**: id, name, slug (Hoodie, T-shirt, Jersey, Pants…)
- **Product**: id, name, slug, description, price (millimes), categoryId, collectionId?, isFeatured, isActive, createdAt
- **ProductImage**: id, productId, url, position
- **Variant**: id, productId, size (XS/S/M/L/XL/XXL), stock (int ≥ 0), with a unique constraint on (productId, size)
- **Order**: id, shortCode (e.g. `FO-7K2Q`), userId?, guest email/name/phone, address snapshot, status (`PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED`), subtotal, shippingFee, total, paymentMethod (`COD` for now), createdAt
- **OrderItem**: id, orderId, variantId, productName/size/unitPrice **snapshots**, quantity

## Storefront features
1. **Home**: hero carousel, featured products, and collection links in the top nav
2. **Shop**: product grid with min/max price filters, sort (price ↑↓, newest), and category and collection filters. Filters are stored in URL search params.
3. **Search**: header search overlay leading to `/search?q=`, matching name and category
4. **Product page**: image gallery with thumbnails, size selector (out-of-stock sizes disabled), quantity stepper capped at available stock, Add to Cart. Show inline errors instead of toasts for missing size or quantity.
5. **Cart**: line items with size, a stepper that cannot exceed stock, remove, clear, and subtotal + flat **7 TND shipping** = total. The header badge shows total quantity.
6. **Checkout**: guest or logged in. Fields: first/last name, email, phone (+216 format), city, street, ZIP. Payment is **cash on delivery**. On submit, a server action re-validates prices and stock, decrements stock, and creates the order in one transaction. Then redirect to `/order/[shortCode]` confirmation.
7. **Account** (optional for customers): sign up, log in, order history.

## Admin features
1. **Dashboard**: revenue (total and last 30 days), order count by status, low-stock variants (≤ 3), and latest orders
2. **Orders**: table with short code, date, customer, total, a status badge and filters by status. On the order detail page: items, customer, address, status dropdown, and cancel. Cancelling restocks the variants.
3. **Customers**: list with order count and total spent; the detail page shows their orders
4. **Stock / Products**: searchable table (image, name, price, per-size stock, category). Full create/edit/delete: name, price, category, collection, description, multiple images (upload, reorder, delete), variants (add/remove size, edit stock), featured/active toggles.
5. **Categories and collections**: simple CRUD

## Bugs from the old version that must not come back
- The cart let quantity exceed stock (25 added when only 20 were in stock). Clamp quantities in the UI and enforce stock on the server.
- Price formatting such as `600. 00`. Use the single `formatTND` helper everywhere.
- The orders table's "Order Date" column showed IDs instead of dates.
- The "1th Anniversary" typo should be "1st Anniversary".
- The checkout item count disagreed with the cart badge.
- Order totals were trusted from the client. Always recompute them on the server.

## Seed data
`prisma/seed.ts` creates 1 admin (credentials from `.env`), 3 collections, 4 categories, and about 12 **original FLOCK OFF products** (e.g. "Flock Off Essential Hoodie – Black", "Migration Tee – Bone", "Night Flight Zip Hoodie", "Flock Logo Jersey"). Give them sizes S–XL with stock 5–20 and neutral placeholder images (solid color with the product name). **No third-party brand names or logos.**

## Build phases
1. Scaffold, Docker Postgres, Prisma schema, migrations, seed, `formatTND`, auth with roles and admin middleware
2. Storefront: layout, home, shop, filters, search, product page
3. Cart, checkout transaction, order confirmation
4. Admin: products/stock CRUD with image upload, orders, customers, dashboard
5. Polish: responsive pass, loading and empty states, SEO metadata, Vitest unit tests for pricing/stock services, one Playwright test for the checkout flow, README with setup and deploy steps (Vercel + Neon/Supabase)

## Later (not in v1)
Online payment (Konnect / Flouci), discount codes, email notifications, wishlists, size guide, and multi-language FR/AR/EN.
