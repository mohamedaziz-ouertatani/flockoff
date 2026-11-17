import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProductImage } from "@/components/shop/product-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTND } from "@/lib/money";
import { listAdminProducts } from "@/lib/services/admin/products";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { SIZES } from "@/lib/validation/admin";

export const metadata: Metadata = { title: "Products & stock" };

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 100);
  const products = await listAdminProducts(q);

  return (
    <>
      <PageHeader
        title="Products & stock"
        description={`${products.length} ${products.length === 1 ? "product" : "products"}${q ? ` matching “${q}”` : ""}`}
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <PlusIcon /> New product
            </Link>
          </Button>
        }
      />

      <form role="search" className="mb-4 flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search name, slug or category" className="h-10 bg-background pl-9" aria-label="Search products" />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {q && (
          <Button asChild variant="ghost">
            <Link href="/admin/products">Clear</Link>
          </Button>
        )}
      </form>

      <div className="overflow-hidden rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Stock by size</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {q ? "No products match that search." : "No products yet."}
                </TableCell>
              </TableRow>
            )}
            {products.map((p) => {
              const stockBySize = new Map(p.variants.map((v) => [v.size, v.stock]));
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="relative aspect-[5/6] w-10 overflow-hidden rounded-sm bg-muted">
                      <ProductImage src={p.images[0]?.url ?? null} alt="" fill sizes="40px" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline hover:underline-offset-4">
                      {p.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{p.collection?.name ?? "No collection"}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatTND(p.price)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {SIZES.filter((s) => stockBySize.has(s)).map((s) => {
                        const stock = stockBySize.get(s)!;
                        return (
                          <span
                            key={s}
                            title={`${s}: ${stock} in stock`}
                            className={cn(
                              "inline-flex min-w-11 flex-col items-center rounded-sm border px-1.5 py-0.5 text-[11px] leading-tight tabular-nums",
                              stock === 0
                                ? "border-red-300 bg-red-50 text-red-800"
                                : stock <= LOW_STOCK_THRESHOLD && "border-amber-300 bg-amber-50 text-amber-900",
                            )}
                          >
                            <span className="text-muted-foreground">{s}</span>
                            <span className="font-semibold">{stock}</span>
                          </span>
                        );
                      })}
                      {p.variants.length === 0 && <span className="text-xs text-muted-foreground">No sizes</span>}
                    </div>
                  </TableCell>
                  <TableCell>{p.category.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.isActive ? (
                        <span className="rounded-sm bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-900">Active</span>
                      ) : (
                        <span className="rounded-sm bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-700">Hidden</span>
                      )}
                      {p.isFeatured && <span className="rounded-sm bg-brand/15 px-1.5 py-0.5 text-xs text-brand">Featured</span>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
