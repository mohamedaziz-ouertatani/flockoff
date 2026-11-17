import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { ProductGrid } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { getCategories, searchProducts } from "@/lib/services/catalog";
import { parseSearchQuery, type RawSearchParams } from "@/lib/validation/catalog";

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = parseSearchQuery(await searchParams);
  return {
    title: q ? `Search: ${q}` : "Search",
    robots: { index: false }, // result pages are thin, duplicate content
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = parseSearchQuery(await searchParams);
  const [results, categories] = await Promise.all([searchProducts(q), getCategories()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <form action="/search" method="get" role="search" className="flex max-w-2xl items-center gap-3 border-b-2 border-foreground">
        <SearchIcon className="size-6 shrink-0" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={q}
          maxLength={100}
          placeholder="Search products"
          aria-label="Search products"
          className="h-14 w-full bg-transparent text-2xl outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" variant="ghost">
          Search
        </Button>
      </form>

      {q ? (
        <>
          <h1 className="mt-10 mb-8 text-sm text-muted-foreground" aria-live="polite">
            {results.length} {results.length === 1 ? "result" : "results"} for{" "}
            <span className="font-medium text-foreground">“{q}”</span>
          </h1>
          {results.length > 0 ? (
            <ProductGrid products={results} priorityCount={4} />
          ) : (
            <div className="flex flex-col items-start gap-4 border border-dashed p-10">
              <p className="font-display text-3xl tracking-wide uppercase">No matches</p>
              <p className="text-sm text-muted-foreground">Check the spelling, or browse a category instead:</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Button key={c.id} asChild variant="outline" size="sm">
                    <Link href={`/shop?category=${c.slug}`}>{c.name}</Link>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <h1 className="mt-10 text-sm text-muted-foreground">Search by product name or category, like “hoodie” or “migration”.</h1>
      )}
    </div>
  );
}
