"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SearchOverlay() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Search">
          <SearchIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-24 translate-y-0 gap-2 sm:max-w-xl">
        <DialogTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Search
        </DialogTitle>
        <DialogDescription className="sr-only">Search products by name or category</DialogDescription>
        <form onSubmit={submit} role="search" className="flex items-center gap-2 border-b-2 border-foreground">
          <SearchIcon className="size-5 shrink-0" aria-hidden />
          <input
            autoFocus
            type="search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={100}
            placeholder="Hoodies, tees, jerseys…"
            aria-label="Search products"
            className="h-12 w-full bg-transparent text-lg outline-none placeholder:text-muted-foreground"
          />
        </form>
        <p className="text-xs text-muted-foreground">Press Enter to search</p>
      </DialogContent>
    </Dialog>
  );
}
