/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export function Logo({ height = 28, href = "/" }: { height?: number; href?: string | null }) {
  const img = (
    <img src="/brand/snowthumb-logo.png" alt="SnowThumb" width={Math.round(height * 6.12)} height={height}
      style={{ height, width: "auto" }} />
  );
  return href ? <Link href={href} aria-label="SnowThumb home" className="inline-flex shrink-0">{img}</Link> : img;
}

export function Footer() {
  return (
    <footer className="border-t border-line mt-16">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row gap-4 sm:items-center justify-between text-sm text-muted">
        <div className="flex items-center gap-3">
          <Logo height={20} href={null} />
          <span>Sponsor console</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <a className="hover:text-text" href="https://snowthumb.com" target="_blank" rel="noreferrer">snowthumb.com</a>
          <a className="hover:text-text" href="mailto:sponsors@snowthumb.com">sponsors@snowthumb.com</a>
          <a className="hover:text-text" href="/apply">Become a sponsor</a>
          <a className="hover:text-text" href="/privacy">Privacy</a>
        </nav>
      </div>
    </footer>
  );
}
