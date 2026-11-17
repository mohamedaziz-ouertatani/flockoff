"use client";

import Link from "next/link";
import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type NavLink = { href: string; label: string };

export function MobileNav({ links, collections }: { links: NavLink[]; collections: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 gap-0 p-6">
        <SheetTitle className="font-display text-2xl tracking-wide uppercase">Flock Off</SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>
        <nav className="mt-8 flex flex-col gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={close} className="py-2 text-lg font-medium">
              {l.label}
            </Link>
          ))}
          <p className="mt-6 mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Collections
          </p>
          {collections.map((l) => (
            <Link key={l.href} href={l.href} onClick={close} className="py-2 text-base">
              {l.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
