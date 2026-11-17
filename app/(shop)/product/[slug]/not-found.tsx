import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <p className="font-display text-5xl tracking-wide uppercase">Flown off</p>
      <p className="text-muted-foreground">This product doesn&apos;t exist or is no longer available.</p>
      <Button asChild>
        <Link href="/shop">Back to the shop</Link>
      </Button>
    </div>
  );
}
