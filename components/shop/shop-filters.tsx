import Link from "next/link";
import { cn } from "@/lib/utils";
import { millimesToTndInput } from "@/lib/money";
import { shopHref } from "@/lib/shop-url";
import type { ShopFilters } from "@/lib/validation/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string; slug: string };

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "-mx-2 block px-2 py-1.5 text-sm",
        active ? "bg-foreground font-medium text-background" : "hover:bg-accent",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Server-rendered filters: category/collection are plain links and the price range is a GET
 * form, so filtering works before (and without) JavaScript.
 */
export function ShopFiltersPanel({
  filters,
  categories,
  collections,
  bounds,
}: {
  filters: ShopFilters;
  categories: Option[];
  collections: Option[];
  bounds: { min: number; max: number };
}) {
  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Category
        </legend>
        <FilterLink href={shopHref(filters, { category: null })} active={!filters.category}>
          All
        </FilterLink>
        {categories.map((c) => (
          <FilterLink key={c.id} href={shopHref(filters, { category: c.slug })} active={filters.category === c.slug}>
            {c.name}
          </FilterLink>
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Collection
        </legend>
        <FilterLink href={shopHref(filters, { collection: null })} active={!filters.collection}>
          All
        </FilterLink>
        {collections.map((c) => (
          <FilterLink
            key={c.id}
            href={shopHref(filters, { collection: c.slug })}
            active={filters.collection === c.slug}
          >
            {c.name}
          </FilterLink>
        ))}
      </fieldset>

      <form action="/shop" method="get" className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Price (TND)</p>
        {/* Keep the other filters when applying a price range. */}
        {filters.category && <input type="hidden" name="category" value={filters.category} />}
        {filters.collection && <input type="hidden" name="collection" value={filters.collection} />}
        {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="min-price" className="text-xs">
              Min
            </Label>
            <Input
              id="min-price"
              name="min"
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,3})?"
              placeholder={millimesToTndInput(bounds.min)}
              defaultValue={filters.min !== undefined ? millimesToTndInput(filters.min) : ""}
            />
          </div>
          <span className="pb-2 text-muted-foreground">–</span>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="max-price" className="text-xs">
              Max
            </Label>
            <Input
              id="max-price"
              name="max"
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,3})?"
              placeholder={millimesToTndInput(bounds.max)}
              defaultValue={filters.max !== undefined ? millimesToTndInput(filters.max) : ""}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" className="flex-1">
            Apply
          </Button>
          {(filters.min !== undefined || filters.max !== undefined) && (
            <Button asChild type="button" size="sm" variant="outline">
              <Link href={shopHref(filters, { min: null, max: null })} scroll={false}>
                Reset
              </Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
