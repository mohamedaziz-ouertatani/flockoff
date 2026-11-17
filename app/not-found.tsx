import Link from "next/link";

// Root 404 for any unmatched URL. Rendered without the shop chrome, so keep it self-contained.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <p className="font-display text-[22vw] leading-none tracking-wide uppercase sm:text-[10rem]">404</p>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-wide uppercase">This page flew off</h1>
        <p className="text-muted-foreground">The link may be old, or the page may have moved.</p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className="bg-foreground px-5 py-3 text-sm font-semibold tracking-widest text-background uppercase">
          Home
        </Link>
        <Link href="/shop" className="border border-foreground px-5 py-3 text-sm font-semibold tracking-widest uppercase">
          Shop all
        </Link>
      </div>
    </main>
  );
}
