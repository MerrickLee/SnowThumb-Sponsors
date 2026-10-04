"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

type Props = Record<string, string | number | boolean | undefined>;

/** A download/link that records an event when clicked. */
export function TrackedLink({ event, props, ...a }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { event: string; props?: Props }) {
  return <a {...a} onClick={(e) => { track(event, props); a.onClick?.(e); }} />;
}

/** Records an event once, when the page mounts. */
export function TrackOnMount({ event, props }: { event: string; props?: Props }) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => { track(event, JSON.parse(key)); }, [event, key]);
  return null;
}

/** Records an event the first time its children scroll into view. */
export function TrackOnView({ event, props, children, className }: { event: string; props?: Props; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { track(event, JSON.parse(key)); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [event, key]);
  return <div ref={ref} className={className}>{children}</div>;
}
