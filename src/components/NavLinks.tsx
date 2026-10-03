"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; exact?: boolean; badge?: number };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto -mx-1 px-1 [scrollbar-width:none]">
      {items.map((n) => {
        const active = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
            className={`relative px-3 py-2.5 rounded-md text-sm font-bold whitespace-nowrap transition-colors ${
              active ? "text-text bg-accent-soft" : "text-muted hover:text-text hover:bg-surface-2"
            }`}>
            {n.label}
            {!!n.badge && (
              <span className="ml-1.5 inline-grid place-items-center min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[11px] num">{n.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
