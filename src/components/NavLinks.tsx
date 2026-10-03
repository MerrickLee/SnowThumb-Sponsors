"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; exact?: boolean; badge?: number };

export function NavLinks({ items, scroller }: { items: NavItem[]; scroller?: boolean }) {
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);

  // On phones the nav is a horizontal strip: keep the current page in view.
  useEffect(() => {
    if (!scroller) return;
    const el = ref.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const nav = ref.current;
    if (el && nav) nav.scrollTo({ left: el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2, behavior: "auto" });
  }, [path, scroller]);

  return (
    <nav ref={ref} aria-label="Main"
      className={`flex gap-1 ${scroller ? "overflow-x-auto -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-24px),transparent)]" : "flex-wrap"}`}>
      {items.map((n) => {
        const active = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
            className={`relative px-3 py-2.5 rounded-md text-sm font-bold whitespace-nowrap transition-colors ${
              active ? "text-text bg-accent-soft" : "text-muted hover:text-text hover:bg-surface-2"
            }`}>
            {n.label}
            {!!n.badge && (
              <span className="ml-1.5 inline-grid place-items-center min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[11px] num">
                {n.badge}<span className="sr-only"> waiting</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
