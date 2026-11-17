# FLOCK OFF

Online store for FLOCK OFF, an independent streetwear brand from Tunis. Customer shop and admin
panel in one Next.js 15 app. See [CLAUDE.md](CLAUDE.md) for the full build spec.

> Status: **Phase 4** — admin panel: dashboard, orders, products & stock with image upload, customers, categories & collections.

## Stack

Next.js 15 (App Router) · TypeScript strict · PostgreSQL + Prisma 6 · Auth.js v5 (credentials,
JWT sessions) · Zod 4 · Tailwind CSS 4 · pnpm

## Local setup

Requires Node 22+, pnpm 9 and Docker.

```bash
pnpm install
cp .env.example .env      # then set AUTH_SECRET and SEED_ADMIN_PASSWORD
pnpm db:up                # Postgres 16 on localhost:5434
pnpm db:migrate           # apply migrations
pnpm db:seed              # admin + 3 collections, 4 categories, 12 products (safe to re-run)
pnpm dev                  # http://localhost:3000
```

Generate `AUTH_SECRET` with `npx auth secret` or `openssl rand -base64 32`.

Postgres is mapped to host port **5434** to avoid clashing with a native Postgres on 5432.

## Scripts

| Script            | What it does                                |
| ----------------- | ------------------------------------------- |
| `pnpm dev`        | Dev server (Turbopack)                      |
| `pnpm typecheck`  | `tsc --noEmit`                              |
| `pnpm lint`       | ESLint                                      |
| `pnpm db:up`      | Start Postgres via docker compose           |
| `pnpm db:migrate` | `prisma migrate dev`                        |
| `pnpm db:seed`    | Run `prisma/seed.ts`                        |
| `pnpm db:reset`   | Drop, re-migrate and re-seed the database   |
| `pnpm db:studio`  | Prisma Studio                               |

## Layout

```
app/(shop)/           storefront: home, /shop, /search, /product/[slug], /login
app/(admin)/admin/    admin routes — gated by middleware.ts + a server-side check in the layout
app/placeholder/      SVG placeholder product images (solid color + name)
auth.config.ts        edge-safe Auth.js config (used by middleware)
auth.ts               full Auth.js config with the Credentials provider
lib/money.ts          formatTND / tndToMillimes — money is always integer millimes
components/shop/      storefront components; components/ui/ is shadcn/ui
lib/services/         business logic (server only)
lib/validation/       Zod schemas shared by client and server
prisma/               schema, migrations, seed
```

## Conventions

- **Money is integer millimes** (1 TND = 1000). Display only via `formatTND()`:
  `180000 → "180 TND"`, `180500 → "180.500 TND"`.
- The database enforces `stock >= 0`, non-negative prices/amounts, `quantity > 0` and
  `total = subtotal + shippingFee` via CHECK constraints (see the init migration).
- Order items keep name/size/price snapshots; deleting a variant later sets `variantId` to null
  instead of destroying order history.

Deployment notes (Vercel + Neon/Supabase) arrive in Phase 5.

## Checkout and orders

- The cart is a Zustand store persisted to `localStorage` (`flockoff-cart`). Prices and stock in
  it are a display cache, refreshed from the server whenever the cart or checkout opens.
- `placeOrder` (server action) re-validates input with Zod, then `lib/services/orders.ts` runs one
  `prisma.$transaction`: reload prices, recompute totals (refusing if they differ from what the
  shopper saw), decrement each variant with a conditional `UPDATE … WHERE stock >= qty`, and
  insert the order with name/size/price snapshots. Any shortfall rolls the whole order back.
- Order confirmation pages (`/order/FO-XXXX`) show personal details only to the browser that
  placed the order (httpOnly cookie of order ids), the owning account, or an admin. Short codes
  are guessable, so everyone else sees just the status.

## Admin panel (`/admin`)

- **Access:** `middleware.ts` gates `/admin` pages, the admin layout re-checks, and every admin server
  action calls `assertAdmin()` itself, because server actions are POST endpoints that middleware
  does not cover.
- **Orders:** status moves forward only (Pending → Confirmed → Shipped → Delivered). Cancelling is a
  separate action that restocks in the same transaction and is refused once delivered. Status
  changes and cancels are compare-and-set, so two admins can't double-restock.
- **Stock edits** only apply if the stock is still what the admin saw. A sale in between is
  reported instead of being overwritten.
- **Customers** are grouped from orders by email (most checkouts are guests). Customer pages are
  keyed by an opaque id, so emails never appear in URLs.
- **Dashboard revenue** excludes cancelled orders; "collected" counts delivered orders only (cash on
  delivery).

## Image storage

`lib/storage.ts` exposes one interface with two drivers, chosen by `STORAGE_DRIVER`:

- `local` (default): files in `./uploads` (gitignored), served by `app/uploads/[file]`. For local
  development only, since serverless hosts have no persistent disk.
- `cloudinary`: signed uploads; set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`. **Not yet tested against a real Cloudinary account.**

Uploads are validated by file content (JPEG/PNG/WebP/AVIF magic bytes, max 5 MB), not by the
browser-reported type, so renamed files and SVGs are rejected.

To build without disturbing a running dev server: `NEXT_DIST_DIR=.next-build pnpm build`.
