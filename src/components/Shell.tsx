import Link from "next/link";

type NavItem = { href: string; label: string };

export function Shell({
  area,
  nav,
  email,
  children,
}: {
  area: string;
  nav: NavItem[];
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-line bg-surface/60 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-2 shrink-0">
            <span className="font-semibold tracking-tight">SnowThumb</span>
            <span className="text-xs text-accent uppercase tracking-[.18em]">{area}</span>
          </Link>
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="px-3 py-1.5 rounded-md text-muted hover:text-text hover:bg-surface-2 whitespace-nowrap">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted hidden md:inline">{email}</span>
            <form action="/auth/signout" method="post">
              <button className="btn btn-sm">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl w-full px-4 py-8 flex-1">{children}</main>
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="text-muted text-sm mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card p-8 text-center text-muted text-sm">{children}</div>;
}
