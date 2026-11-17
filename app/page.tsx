import Link from "next/link";

// Placeholder home — the real storefront lands in Phase 2 under app/(shop).
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-4xl font-black tracking-tight">FLOCK OFF</h1>
      <p className="text-neutral-500">Streetwear from Tunis. Store coming soon.</p>
      <nav className="flex gap-4 text-sm underline">
        <Link href="/login">Log in</Link>
        <Link href="/admin">Admin</Link>
      </nav>
    </main>
  );
}
