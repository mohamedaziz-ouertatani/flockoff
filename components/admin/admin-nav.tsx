"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoxesIcon, LayoutDashboardIcon, ReceiptIcon, TagsIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ReceiptIcon },
  { href: "/admin/products", label: "Products & stock", icon: BoxesIcon },
  { href: "/admin/customers", label: "Customers", icon: UsersIcon },
  { href: "/admin/catalog", label: "Categories & collections", icon: TagsIcon },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
