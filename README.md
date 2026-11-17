# FLOCK OFF

Online store for FLOCK OFF, an independent streetwear brand from Tunis: the customer shop and the
admin panel in one Next.js 15 app. Cash on delivery, prices in Tunisian dinars. The full product
spec is in [CLAUDE.md](CLAUDE.md).

**Stack:** Next.js 15 (App Router, Server Actions) · TypeScript (strict) · PostgreSQL + Prisma 6 ·
Auth.js v5 (credentials, JWT sessions, `CUSTOMER`/`ADMIN` roles) · Zod 4 · Zustand ·
Tailwind CSS 4 + shadcn/ui · Vitest · Playwright · pnpm

---

## Local setup

Requires **Node 22+**, **pnpm 9** and **Docker**.

```bash
pnpm install
cp .env.example .env    # then edit: AUTH_SECRET and SEED_ADMIN_PASSWORD at minimum
pnpm db:up              # Postgres 16 in Docker, on localhost:5434
pnpm db:migrate         # apply migrations
pnpm db:seed            # admin + 3 collections, 4 categories, 12 products (safe to re-run)
pnpm dev                # http://localhost:3000
```

- Generate `AUTH_SECRET` with `npx auth secret` or `openssl rand -base64 32`.
- Log in at `/login` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`, then open `/admin`.
- Postgres is mapped to host port **5434** so it doesn't clash with a native Postgres on 5432.
- Re-running `pnpm db:seed` resets the seeded products' stock and the admin's password to the
  values in `.env`. It never deletes orders.

## Scripts

| Script                  | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `pnpm dev`              | Dev server (Turbopack)                                          |
| `pnpm build` / `start`  | Production build / serve it                                     |
| `pnpm typecheck`        | `tsc --noEmit`                                                  |
| `pnpm lint`             | ESLint                                                          |
| `pnpm test`             | All Vitest tests (unit + integration)                           |
| `pnpm test:unit`        | Unit tests only: fast, no database                              |
| `pnpm test:integration` | Service tests against the **test** database                     |
| `pnpm test:e2e`         | Playwright checkout test (builds and serves the app on :3100)   |
| `pnpm db:up`            | Start Postgres via docker compose                               |
| `pnpm db:migrate`       | `prisma migrate dev`: create/apply migrations in development    |
| `pnpm db:deploy`        | `prisma migrate deploy`: apply pending migrations (production) |
| `pnpm db:seed`          | Run `prisma/seed.ts`                                            |
| `pnpm db:reset`         | Drop, re-migrate and re-seed the **dev** database               |
| `pnpm db:studio`        | Prisma Studio                                                   |

## Testing

| Layer           | Where                     | Needs                 | Covers                                                                                                            |
| --------------- | ------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Unit**        | `lib/**/*.test.ts`        | nothing               | `formatTND`, TND parsing, totals, stock clamping, phone numbers, Zod schemas, cart store                          |
| **Integration** | `tests/integration/`      | Postgres (`db:up`)    | Checkout transaction (no overselling under 8 concurrent buyers, rollbacks, tampered totals), cancel/restock races, stock edits vs. concurrent sales |
| **End to end**  | `tests/e2e/`              | Postgres + Chromium   | Guest buys a product: size error, stock-capped quantity, cart badge, totals, checkout validation, confirmation    |

Integration and e2e tests use a **separate database**, `flockoff_test`, on the same Postgres
container (override with `TEST_DATABASE_URL`). Setup only runs `prisma migrate deploy` (never a
reset) and refuses any database whose name doesn't contain `test`. Tests create their own
uniquely named fixtures, so leftover rows from earlier runs don't matter.

The e2e test builds the app into `.next-e2e` and serves it on port 3100 with the test database,
so it can run while `pnpm dev` is up. First time only: `pnpm exec playwright install chromium`.

## How it's built

```
app/(shop)/             storefront: home, /shop, /search, /product/[slug], /cart, /checkout, /order/[code], /login
app/(admin)/admin/      admin panel (dashboard, orders, products & stock, customers, catalog)
app/placeholder/        generated SVG placeholder images (solid color + product name)
app/uploads/            serves images stored by the local storage driver
lib/services/           business logic; server-only, called by server actions and pages
lib/actions/            server actions: validate with Zod, check auth, call a service
lib/validation/         Zod schemas shared by client and server
lib/money.ts            formatTND / tndToMillimes: money is always integer millimes
lib/pricing.ts          computeTotals: shared by the cart UI and the server
lib/cart/store.ts       Zustand cart persisted to localStorage
lib/storage.ts          image storage interface (local disk or Cloudinary)
auth.config.ts          edge-safe Auth.js config (middleware); auth.ts adds the Credentials provider
prisma/                 schema, migrations (incl. CHECK constraints), seed
tests/                  integration + e2e tests and their setup
```

**Money.** Every amount is an integer number of millimes (1 TND = 1000) and is displayed only via
`formatTND()`: `180000 → "180 TND"`, `180500 → "180.500 TND"`. The database also enforces
`stock >= 0`, non-negative prices, `quantity > 0` and `total = subtotal + shippingFee`.

**Checkout.** The cart in `localStorage` is only a display cache. It's refreshed from the server
whenever the cart or checkout opens, and changes are explained to the shopper. `placeOrder`
re-validates everything, then `createOrder` runs one transaction:

- It reloads prices from the database.
- It recomputes totals, and refuses if they differ from what the shopper saw.
- It decrements each variant with a conditional `UPDATE … WHERE stock >= qty`, so it can never
  oversell.
- It stores name/size/price snapshots on the order items.

Any shortfall rolls the whole order back.

**Order privacy.** Short codes like `FO-7K2Q` are guessable, so `/order/[code]` only shows personal
details to the browser that placed the order (httpOnly cookie), the owning account, or an admin.
Access is checked before any personal data is loaded.

**Admin.**

- **Access** is checked in three places: `middleware.ts` gates `/admin`, the admin layout checks
  again, and **every admin server action calls `assertAdmin()` itself**. That last check matters
  because server actions are POST endpoints that middleware doesn't cover.
- **Status changes, cancellations and stock edits** are compare-and-set. Two admins, or an admin
  and a customer, can't silently overwrite each other, and a cancel restocks exactly once.
- **Customers** are grouped from orders by email, because most checkouts are guests.
- **Dashboard revenue** excludes cancelled orders. "Collected" counts delivered orders only.

**Images.** `lib/storage.ts` has two drivers, chosen by `STORAGE_DRIVER`:

- `local` (development): files in `./uploads`.
- `cloudinary`: signed REST uploads. **Not yet tested against a real account.**

Uploads are validated by their bytes (JPEG/PNG/WebP/AVIF, max 5 MB), so renamed files and SVGs
are rejected.

---

## Deploying (Vercel + Neon or Supabase)

### 1. Database

Create a Postgres database and copy **two** connection strings:

| | `DATABASE_URL` (runtime, pooled) | `DIRECT_URL` (migrations, direct) |
| --- | --- | --- |
| **Neon** | The **pooled** string (host contains `-pooler`), with `?sslmode=require` | The **direct** string (no `-pooler`), with `?sslmode=require` |
| **Supabase** | *Transaction pooler*, port **6543**, add `?pgbouncer=true&connection_limit=1` | *Session pooler* or direct connection, port **5432** |

The pooled URL keeps serverless functions from exhausting connections. Migrations need the direct
one.

### 2. Images

Vercel has no persistent disk, so the `local` driver **won't work in production**. Create a
Cloudinary account and set `STORAGE_DRIVER=cloudinary` plus the three `CLOUDINARY_*` keys.

### 3. Vercel project

Import the repository in Vercel (the framework is detected as Next.js), then set these
environment variables for **Production** (and Preview, if you use preview deployments):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | pooled connection string (see above) |
| `DIRECT_URL` | direct connection string |
| `AUTH_SECRET` | a new random value: `openssl rand -base64 32` (don't reuse the dev one) |
| `NEXT_PUBLIC_SITE_URL` | your public origin, e.g. `https://flockoff.tn` (canonical URLs, sitemap, previews) |
| `STORAGE_DRIVER` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from the Cloudinary dashboard |

`AUTH_TRUST_HOST` isn't needed on Vercel (it's detected automatically).

Deploy. The `vercel-build` script runs `prisma migrate deploy` and then `next build`, so every
deploy applies pending migrations before going live. `postinstall` generates the Prisma client.

### 4. First admin

The seed creates the admin account **and demo products**. For a real launch, create only the
admin, from your machine, pointing at the production database:

```bash
DATABASE_URL="<direct url>" DIRECT_URL="<direct url>" \
SEED_ADMIN_EMAIL="you@yourdomain" SEED_ADMIN_PASSWORD="<long random password>" \
pnpm db:seed
```

Then delete or hide the demo products from `/admin/products`. For a demo or staging site, keep
them.

### 5. Check it

- `/robots.txt` and `/sitemap.xml` use your `NEXT_PUBLIC_SITE_URL`.
- Place a test order, then cancel it in `/admin/orders` (this restocks it).

### Self-hosting instead of Vercel

Run `pnpm build && pnpm start` with the same variables, plus **`AUTH_TRUST_HOST=true`** (or
`AUTH_URL=https://your.domain`). Without it, Auth.js rejects every session with `UntrustedHost`
and `/admin` redirects to login. The `local` image driver works if the `uploads/` directory is
on a persistent volume.

---

## Troubleshooting

- **`pnpm` fails with "Cannot find matching keyid" (corepack).** Older corepack versions can't
  verify current pnpm signatures. Run `corepack disable`, then `npm i -g pnpm@9`.
- **Port 5432 or 5434 already in use.** Change the host port in `docker-compose.yml` and in both
  URLs in `.env`.
- **Build alongside a running dev server.** `NEXT_DIST_DIR=.next-build pnpm build` writes to a
  separate folder instead of `.next`.
- **A page shows an old layout in `pnpm dev`.** Turbopack occasionally keeps a stale version of a
  shared layout for some routes after the layout changes. Restart `pnpm dev`, and delete `.next` if
  it persists.

## Not in v1

Online payment (Konnect / Flouci), discount codes, email notifications, wishlists, a size guide,
FR/AR/EN translations, and customer sign-up and order history pages. Orders placed while logged in
are already linked to the account.
