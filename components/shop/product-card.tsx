import Link from "next/link";
import { formatTND } from "@/lib/money";
import type { ProductCardData } from "@/lib/services/catalog";
import { ProductImage } from "./product-image";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  return (
    <Link href={`/product/${product.slug}`} className="group flex flex-col gap-3 outline-none">
      <div className="relative aspect-[5/6] overflow-hidden bg-muted ring-offset-2 ring-offset-background group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {product.soldOut && (
          <span className="absolute top-2 left-2 bg-foreground px-2 py-1 text-[10px] font-semibold tracking-widest text-background uppercase">
            Sold out
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] tracking-widest text-muted-foreground uppercase">{product.categoryName}</span>
        <span className="text-sm leading-snug font-medium group-hover:underline group-hover:underline-offset-4">
          {product.name}
        </span>
        <span className="text-sm tabular-nums">{formatTND(product.price)}</span>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
