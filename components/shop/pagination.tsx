import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const linkCls = "grid h-9 min-w-9 place-items-center border px-2 text-sm tabular-nums";

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(linkCls, "hover:bg-accent")} aria-label="Previous page">
          <ChevronLeftIcon className="size-4" />
        </Link>
      ) : (
        <span className={cn(linkCls, "opacity-40")} aria-hidden>
          <ChevronLeftIcon className="size-4" />
        </span>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(linkCls, p === page ? "border-foreground bg-foreground text-background" : "hover:bg-accent")}
        >
          {p}
        </Link>
      ))}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(linkCls, "hover:bg-accent")} aria-label="Next page">
          <ChevronRightIcon className="size-4" />
        </Link>
      ) : (
        <span className={cn(linkCls, "opacity-40")} aria-hidden>
          <ChevronRightIcon className="size-4" />
        </span>
      )}
    </nav>
  );
}
