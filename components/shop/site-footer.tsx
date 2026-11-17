import Link from "next/link";
import { getCategories } from "@/lib/services/catalog";

export async function SiteFooter() {
  const categories = await getCategories();
  return (
    <footer className="mt-24 border-t bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="font-display text-5xl leading-none tracking-wide uppercase">Flock Off</p>
          <p className="mt-4 max-w-xs text-sm text-background/70">
            Independent streetwear, designed in Tunis. Cash on delivery across Tunisia.
          </p>
        </div>
        <nav aria-label="Categories" className="flex flex-col gap-2 text-sm">
          <p className="mb-1 text-[11px] font-semibold tracking-widest text-background/50 uppercase">Shop</p>
          {categories.map((c) => (
            <Link key={c.id} href={`/shop?category=${c.slug}`} className="hover:underline">
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-2 text-sm">
          <p className="mb-1 text-[11px] font-semibold tracking-widest text-background/50 uppercase">Info</p>
          <span className="text-background/70">Flat 7 TND shipping</span>
          <span className="text-background/70">Pay cash on delivery</span>
        </div>
      </div>
      <div className="border-t border-background/15">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-background/50 sm:px-6">
          © {new Date().getFullYear()} FLOCK OFF. Tunis.
        </p>
      </div>
    </footer>
  );
}
