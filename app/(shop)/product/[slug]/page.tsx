import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/shop/product-card";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductPurchase } from "@/components/shop/product-purchase";
import { formatTND } from "@/lib/money";
import { getProductBySlug, getRelatedProducts } from "@/lib/services/catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    alternates: { canonical: `/product/${product.slug}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.category.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/shop" className="hover:text-foreground">
              Shop
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />

        <div className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-3">
            {product.collection && (
              <Link
                href={`/shop?collection=${product.collection.slug}`}
                className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase hover:text-foreground"
              >
                {product.collection.name}
              </Link>
            )}
            <h1 className="font-display text-4xl leading-none tracking-wide uppercase sm:text-5xl">{product.name}</h1>
            <p className="text-xl tabular-nums">{formatTND(product.price)}</p>
          </div>

          <ProductPurchase
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              imageUrl: product.images[0]?.url ?? null,
            }}
            variants={product.variants}
          />

          <div className="flex flex-col gap-3 border-t pt-6 text-sm">
            <p className="leading-relaxed text-muted-foreground">{product.description}</p>
            <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
              <li>Flat 7 TND shipping across Tunisia</li>
              <li>Cash on delivery</li>
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-24">
          <h2 id="related-heading" className="mb-8 font-display text-3xl tracking-wide uppercase sm:text-4xl">
            More {product.category.name}
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
