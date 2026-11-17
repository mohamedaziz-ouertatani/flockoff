import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Pagination } from "@/components/shop/pagination";
import { ProductGrid } from "@/components/shop/product-card";
import { ShopFiltersPanel } from "@/components/shop/shop-filters";
import { SortSelect } from "@/components/shop/sort-select";
import { Button } from "@/components/ui/button";
import { formatTND } from "@/lib/money";
import { getCategories, getCollections, getPriceBounds, listProducts } from "@/lib/services/catalog";
import { shopHref } from "@/lib/shop-url";
import { parseShopFilters, type RawSearchParams } from "@/lib/validation/catalog";

type Props = { searchParams: Promise<RawSearchParams> };

async function resolveNames(params: RawSearchParams) {
  const filters = parseShopFilters(params);
  const [categories, collections] = await Promise.all([getCategories(), getCollections()]);
  const category = categories.find((c) => c.slug === filters.category);
  const collection = collections.find((c) => c.slug === filters.collection);
  return { filters, categories, collections, category, collection };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category, collection } = await resolveNames(await searchParams);
  const title = [collection?.name, category?.name].filter(Boolean).join(" · ") || "Shop all";
  // Collection/category views are real landing pages; price, sort and page variants are not.
  const canonical = new URLSearchParams();
  if (collection) canonical.set("collection", collection.slug);
  if (category) canonical.set("category", category.slug);
  const qs = canonical.toString();
  return {
    title,
    description: collection
      ? `Shop the ${collection.name} collection from FLOCK OFF, streetwear from Tunis.`
      : category
        ? `FLOCK OFF ${category.name.toLowerCase()}s. Streetwear from Tunis, cash on delivery.`
        : undefined,
    alternates: { canonical: qs ? `/shop?${qs}` : "/shop" },
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const { filters, categories, collections, category, collection } = await resolveNames(await searchParams);
  const [result, bounds] = await Promise.all([listProducts(filters), getPriceBounds()]);

  const heading = collection?.name ?? category?.name ?? "Shop all";

  const chips: { label: string; href: string }[] = [];
  if (category) chips.push({ label: category.name, href: shopHref(filters, { category: null }) });
  if (collection) chips.push({ label: collection.name, href: shopHref(filters, { collection: null }) });
  if (filters.min !== undefined) chips.push({ label: `From ${formatTND(filters.min)}`, href: shopHref(filters, { min: null }) });
  if (filters.max !== undefined) chips.push({ label: `Up to ${formatTND(filters.max)}`, href: shopHref(filters, { max: null }) });

  const panel = (
    <ShopFiltersPanel filters={filters} categories={categories} collections={collections} bounds={bounds} />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="font-display text-5xl tracking-wide uppercase sm:text-6xl">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {result.total} {result.total === 1 ? "product" : "products"}
          </p>
        </div>
        <SortSelect value={filters.sort ?? "newest"} />
      </div>

      {chips.length > 0 && (
        <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.label}>
              <Link
                href={c.href}
                scroll={false}
                className="flex items-center gap-1 border px-2.5 py-1 text-xs hover:border-foreground"
                aria-label={`Remove filter: ${c.label}`}
              >
                {c.label} <XIcon className="size-3" />
              </Link>
            </li>
          ))}
          <li>
            <Link href="/shop" className="px-1 text-xs underline underline-offset-4">
              Clear all
            </Link>
          </li>
        </ul>
      )}

      <div className="mt-8 grid gap-10 md:grid-cols-[13rem_1fr]">
        {/* Mobile: collapsible, no JS needed. Desktop: sticky sidebar. */}
        <details className="group border md:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium">
            <SlidersHorizontalIcon className="size-4" /> Filters
            {chips.length > 0 && <span className="text-muted-foreground">({chips.length})</span>}
          </summary>
          <div className="border-t p-4">{panel}</div>
        </details>
        <aside aria-label="Filters" className="hidden md:block">
          <div className="sticky top-24">{panel}</div>
        </aside>

        <div>
          {result.items.length > 0 ? (
            <>
              <ProductGrid products={result.items} priorityCount={4} />
              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                hrefFor={(p) => shopHref(filters, { page: p })}
              />
            </>
          ) : (
            <div className="flex flex-col items-start gap-4 border border-dashed p-10">
              <p className="font-display text-3xl tracking-wide uppercase">Nothing here</p>
              <p className="text-sm text-muted-foreground">No products match these filters. Try widening the price range.</p>
              <Button asChild variant="outline">
                <Link href="/shop">Clear filters</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
