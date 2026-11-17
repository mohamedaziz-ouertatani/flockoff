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
| `pnpm db:seed`          | Admin + demo data (`prisma/seed.ts`); refused on non-local databases unless `-- --with-demo` |
| `pnpm db:create-admin`  | Create/update only the admin (production)                       |
| `pnpm db:reset`         | Drop, re-migrate and re-seed the **dev** database               |
| `pnpm db:studio`        | Prisma Studio                                                   |

## Testing

| Layer           | Where                     | Needs                 | Covers                                                                                                            |
| --------------- | ------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Unit**        | `lib/**/*.test.ts`        | nothing               | `formatTND`, TND parsing, totals, stock clamping, phone numbers, Zod schemas, cart store                          |
| **Integration** | `tests/integration/`      | Postgres (`db:up`)    | Checkout transaction (no overselling under 8 concurrent buyers, rollbacks, tampered totals), cancel/restock races, stock edits vs. concurrent sales |
| **End to end**  | `tests/e2e/`              | Postgres + Chromium   | Guest checkout (size error, stock-capped quantity, badge, totals, validation, confirmation); sign-up → order → order history → change password → log in with the new one |

Integration and e2e tests use a **separate database**, `flockoff_test`, on the same Postgres
container (override with `TEST_DATABASE_URL`). Setup only runs `prisma migrate deploy` (never a
reset) and refuses any database whose name doesn't contain `test`. Tests create their own
uniquely named fixtures, so leftover rows from earlier runs don't matter.

The e2e test builds the app into `.next-e2e` and serves it on port 3100 with the test database,
so it can run while `pnpm dev` is up. First time only: `pnpm exec playwright install chromium`.

**CI.** `.github/workflows/ci.yml` runs on every push to `main` and on every pull request:
typecheck, lint, unit and integration tests, then the e2e tests, against a throwaway Postgres 16
service container. It needs no repository secrets: the database and `AUTH_SECRET` it uses exist
only inside the job. If the e2e tests fail, the Playwright report and traces are uploaded as the
`playwright-report` artifact (kept 7 days).

## How it's built

```
app/(shop)/             storefront: home, /shop, /search, /product/[slug], /cart, /checkout, /order/[code],
                        /login, /signup, /account (order history, change password)
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

**Customer accounts.** Sign-up is optional; guests can always check out. New accounts are always
`CUSTOMER` (the role is never read from input). Passwords are bcrypt-hashed and capped at 72 bytes,
because bcrypt silently ignores anything longer. `/account` lists orders placed **while logged
in**. Earlier guest orders with the same email are deliberately not attached: emails aren't
verified, so attaching them would let anyone who signs up with someone else's address read that
person's orders, including their phone number and home address.

Customers can change their password on `/account` by entering the current one. Wrong current
passwords are limited to 5 per 15 minutes per account, so a hijacked session can't be used to guess
it. The write is compare-and-set, so two simultaneous changes can't overwrite each other. A change
revokes the trusted-device cookies on the account's other browsers (see *Trusted devices*) and signs the account out on every other device: each user has a
`sessionVersion` that is copied into the JWT at login, the server-side `jwt` callback in `auth.ts`
checks it on every session read (one primary-key lookup), and a password change bumps it. The
browser that made the change is signed in again automatically. The same check means role changes
and deleted users take effect immediately on server-rendered pages and actions. (The edge
middleware can't query the database, so on `/admin` the check happens in `requireAdmin()`.)

**Rate limiting.** Login and sign-up are rate-limited with counters stored in Postgres
(`lib/services/rate-limit.ts`), so the limits hold across serverless instances. Emails are hashed
in the counter keys.

| Limit | Allows | Why |
| --- | --- | --- |
| Failed logins, one account from one IP | 5 per 15 min | The main brake on password guessing |
| Failed logins, one account from anywhere | 50 per hour | Caps guessing even from many IPs. Trusted devices (below) are counted separately |
| Failed logins, one account from its trusted devices | 50 per hour | Caps guessing with a stolen trusted-device cookie |
| Any login attempt from one IP | 30 per 15 min | Generous for shared networks (offices, mobile carriers) |
| New accounts from one IP | 10 per hour | Slows bulk account creation |

Successful logins don't count against the failure limits. Login limits are enforced inside the
Auth.js `authorize` step, so they also cover the direct `POST /api/auth/callback/credentials`
endpoint, not just the form. Once a limit is hit, the password isn't checked at all.

**Trusted devices.** An attacker with many IPs could use the per-account limit to lock a customer
out for an hour. To prevent that, every successful login sets `fo_td`, an httpOnly cookie valid for
90 days. It holds an expiry and an HMAC (keyed with `AUTH_SECRET`) of the account's id and a
fingerprint of its current password hash, and nothing personal. A browser with a valid `fo_td` for
the account it's logging into is counted in a separate per-account bucket, which attackers without
the cookie can't fill, so they can't lock the customer out of that browser. The per-IP and
per-account-per-IP limits still apply, and someone who steals the cookie still gets at most 50
guesses per hour. Changing the password revokes every existing cookie for that account, and
rotating `AUTH_SECRET` revokes all of them. The cookie remembers one account per browser (the last
one logged in) (`lib/services/trusted-device.ts`).

**Client IPs come from `X-Forwarded-For`.** Vercel overwrites that header with the real client IP,
so it's trustworthy there. If you self-host, run behind a reverse proxy (nginx, Caddy, Cloudflare)
that *overwrites* it. Otherwise clients can fake their IP and dodge the per-IP limits; the
per-account limit still applies.

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

**Checklist** (details in the steps below):

- [ ] Code on GitHub; the first CI run is green
- [ ] Postgres created; pooled + direct connection strings copied
- [ ] Cloudinary account; cloud name + API key + API secret copied
- [ ] Vercel project imported, all variables from step 3 set **before** the first deploy
- [ ] Deployed; the build log shows `prisma migrate deploy` applying the migrations
- [ ] Admin created with `pnpm db:create-admin` (no demo data)
- [ ] Categories and collections created in `/admin/catalog`, then the real products
- [ ] Test order placed and cancelled; one image upload checked

### 0. GitHub

Create an **empty** repository on GitHub (no README or license, so the histories don't clash), then:

```bash
git remote add origin https://github.com/<you>/flockoff.git
git push -u origin main
```

The push runs CI (`.github/workflows/ci.yml`). Wait for it to pass before deploying.

### 1. Database

Create a Postgres database and copy **two** connection strings:

| | `DATABASE_URL` (runtime, pooled) | `DIRECT_URL` (migrations, direct) |
| --- | --- | --- |
| **Neon** | The **pooled** string (host contains `-pooler`), with `?sslmode=require` | The **direct** string (no `-pooler`), with `?sslmode=require` |
| **Supabase** | *Transaction pooler*, port **6543**, add `?pgbouncer=true&connection_limit=1` | *Session pooler* or direct connection, port **5432** |

The pooled URL keeps serverless functions from exhausting connections. Migrations need the direct
one; the running app only uses `DATABASE_URL`.

**Connected the database through Vercel's Neon or Supabase integration?** They create their own
variable names. The build accepts Neon's `DATABASE_URL_UNPOOLED` or Supabase's
`POSTGRES_URL_NON_POOLING` in place of `DIRECT_URL`. Supabase's integration doesn't set
`DATABASE_URL`, though: add it yourself with the value of `POSTGRES_PRISMA_URL`.

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

`AUTH_TRUST_HOST` isn't needed on Vercel (it's detected automatically). Node 22 is pinned in
`package.json` (`engines`), matching CI.

`NEXT_PUBLIC_SITE_URL` is baked in at build time, so after changing it, **redeploy**.

Deploy. The `vercel-build` script (`scripts/vercel-build.ts`) checks the database variables, runs
`prisma migrate deploy`, then `next build`, so every deploy applies pending migrations before going
live. If a database variable is missing, the build stops with a message naming it and the Vercel
environment to add it to. Environment variables are per environment (Production / Preview /
Development) and only apply to deployments made **after** they're added, so redeploy after
changing them. `postinstall` generates the Prisma client.

**Startup config check.** When a production server starts, `instrumentation.ts` checks the
configuration (`lib/config-check.ts`) and refuses to start if something would break later. For
example: a missing or placeholder `AUTH_SECRET`, local image storage on Vercel, missing Cloudinary
keys, a `localhost` database. Each problem is logged as one `[config]` line in the Vercel function
logs. Warnings, such as a missing `NEXT_PUBLIC_SITE_URL` or a Supabase pooler URL without
`pgbouncer=true`, are logged without stopping the server.

### 4. First admin

From your machine, pointing at the production database (use the **direct** URL):

```bash
DATABASE_URL="<direct url>" DIRECT_URL="<direct url>" \
SEED_ADMIN_EMAIL="you@yourdomain" SEED_ADMIN_PASSWORD="<long random password>" \
pnpm db:create-admin
```

This creates only the admin. Run it again later to reset the admin password; that also signs the
admin out everywhere. The full `pnpm db:seed` (demo products) **refuses** to run against a
non-local database, because it resets the demo products' stock. For a demo or staging site that
should have them, run `pnpm db:seed -- --with-demo`. Never run that against the live shop.

A fresh production database has no categories or collections: create them in `/admin/catalog`
before adding products.

### 5. Check it

- `/robots.txt` and `/sitemap.xml` use your `NEXT_PUBLIC_SITE_URL`.
- Upload one product image in `/admin/products` and check it appears (this is the first real
  Cloudinary call; the driver is only covered by mocked tests).
- Place a test order, then cancel it in `/admin/orders` (this restocks it).

### Self-hosting instead of Vercel

Run `pnpm build && pnpm start` with the same variables, plus **`AUTH_TRUST_HOST=true`** (or
`AUTH_URL=https://your.domain`). Without it, Auth.js rejects every session with `UntrustedHost`
and `/admin` redirects to login. Put the app behind a reverse proxy that overwrites
`X-Forwarded-For` (see *Rate limiting*). The `local` image driver works if the `uploads/` directory is
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
FR/AR/EN translations, and email verification and password reset (both need email sending).
