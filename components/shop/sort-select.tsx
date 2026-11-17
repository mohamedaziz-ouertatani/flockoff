"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SORT_LABELS, SORT_OPTIONS, type SortOption } from "@/lib/validation/catalog";

export function SortSelect({ value }: { value: SortOption }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (next === "newest") sp.delete("sort");
    else sp.set("sort", next);
    sp.delete("page"); // new order -> back to page 1
    const qs = sp.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48" aria-label="Sort products" data-pending={pending || undefined}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {SORT_OPTIONS.map((o) => (
          <SelectItem key={o} value={o}>
            {SORT_LABELS[o]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
