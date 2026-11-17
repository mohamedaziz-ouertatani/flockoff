import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { HeroCarousel, type HeroSlide } from "@/components/shop/hero-carousel";
import { ProductGrid } from "@/components/shop/product-card";
import { ProductImage } from "@/components/shop/product-image";
import { getCollectionShowcase, getFeaturedProducts } from "@/lib/services/catalog";

// Per-collection hero styling. Unknown collections fall back to ink-on-bone.
const HERO_THEME: Record<string, { eyebrow: string; bg: string; fg: string; cta: string }> = {
  "winter-2023": { eyebrow: "Collection", bg: "#1e2a3a", fg: "#f1ede4", cta: "Shop winter" },
  "1st-anniversary": { eyebrow: "One year of Flock Off", bg: "#7f1d1d", fg: "#fbefe6", cta: "Shop the drop" },
  "flock-off-mix": { eyebrow: "Everyday rotation", bg: "#e8e2d4", fg: "#1a1a1a", cta: "Shop the mix" },
};
const FALLBACK_THEME = { eyebrow: "Collection", bg: "#e8e2d4", fg: "#1a1a1a", cta: "Shop now" };

export default async function HomePage() {
  const [collections, featured] = await Promise.all([getCollectionShowcase(), getFeaturedProducts(8)]);

  const slides: HeroSlide[] = collections
    .filter((c) => c.productCount > 0)
    .map((c) => {
      const t = HERO_THEME[c.slug] ?? FALLBACK_THEME;
      return {
        id: c.id,
        eyebrow: t.eyebrow,
        title: c.name,
        href: `/shop?collection=${c.slug}`,
        cta: t.cta,
        bg: t.bg,
        fg: t.fg,
        imageUrl: c.coverUrl,
        imageAlt: c.coverName,
      };
    });

  return (
    <>
      <h1 className="sr-only">FLOCK OFF — streetwear from Tunis</h1>
      <HeroCarousel slides={slides} />

      <section aria-labelledby="featured-heading" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 id="featured-heading" className="font-display text-4xl tracking-wide uppercase sm:text-5xl">
            Featured
          </h2>
          <Link href="/shop" className="flex items-center gap-1 text-sm font-medium hover:underline hover:underline-offset-4">
            Shop all <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        {featured.length > 0 ? (
          <ProductGrid products={featured} />
        ) : (
          <p className="text-muted-foreground">New pieces are on the way.</p>
        )}
      </section>

      {collections.length > 0 && (
        <section aria-labelledby="collections-heading" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <h2 id="collections-heading" className="mb-8 font-display text-4xl tracking-wide uppercase sm:text-5xl">
            Collections
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {collections.map((c) => (
              <li key={c.id}>
                <Link href={`/shop?collection=${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-muted">
                  <ProductImage
                    src={c.coverUrl}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-5 pt-16 text-white">
                    <div>
                      <p className="font-display text-3xl tracking-wide uppercase">{c.name}</p>
                      <p className="text-xs text-white/75">
                        {c.productCount} {c.productCount === 1 ? "piece" : "pieces"}
                      </p>
                    </div>
                    <ArrowRightIcon className="size-5 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
