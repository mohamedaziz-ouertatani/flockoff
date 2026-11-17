import Link from "next/link";
import { UserIcon } from "lucide-react";
import { auth } from "@/auth";
import { getCollections } from "@/lib/services/catalog";
import { Button } from "@/components/ui/button";
import { CartButton } from "./cart-button";
import { MobileNav } from "./mobile-nav";
import { SearchOverlay } from "./search-overlay";

const MAIN_LINKS = [{ href: "/shop", label: "Shop all" }];

export async function SiteHeader() {
  const [collections, session] = await Promise.all([getCollections(), auth()]);
  const collectionLinks = collections.map((c) => ({ href: `/shop?collection=${c.slug}`, label: c.name }));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <MobileNav links={MAIN_LINKS} collections={collectionLinks} />
        <Link href="/" className="font-display text-2xl leading-none tracking-wide uppercase" aria-label="FLOCK OFF home">
          Flock Off
        </Link>

        <nav aria-label="Main" className="ml-8 hidden items-center gap-6 text-sm md:flex">
          {MAIN_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="font-medium hover:underline hover:underline-offset-4">
              {l.label}
            </Link>
          ))}
          <span aria-hidden className="h-4 w-px bg-border" />
          {collectionLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SearchOverlay />
          {session?.user?.role === "ADMIN" && (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/admin">Admin</Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" aria-label={session?.user ? "Your account" : "Log in"}>
            <Link href={session?.user ? "/account" : "/login"}>
              <UserIcon />
            </Link>
          </Button>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
