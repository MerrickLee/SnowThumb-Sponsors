import { Footer, Logo } from "@/components/Brand";
import { NavLinks, type NavItem } from "@/components/NavLinks";

export function Shell({
  area, nav, email, switchTo, children,
}: {
  area: string;
  nav: NavItem[];
  email: string;
  /** Link to the other console (admin <-> sponsor view). */
  switchTo?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const mobileNav = switchTo ? [...nav, { href: switchTo.href, label: switchTo.label, exact: true }] : nav;
  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-surface/90 backdrop-blur border-b border-line sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="h-14 flex items-center gap-4">
            <Logo height={24} />
            <span className="eyebrow text-sky">{area}</span>
            <div className="hidden xl:block ml-2 min-w-0"><NavLinks items={nav} /></div>
            <div className="ml-auto flex items-center gap-2 text-sm">
              {switchTo && <span className="hidden xl:inline"><a href={switchTo.href} className="btn btn-sm btn-ghost whitespace-nowrap">{switchTo.label}</a></span>}
              <span className="text-muted hidden 2xl:inline truncate max-w-56" title={email}>{email}</span>
              <form action="/auth/signout" method="post">
                <button className="btn btn-sm btn-ghost" title={`Signed in as ${email}`}>Sign out</button>
              </form>
            </div>
          </div>
          <div className="xl:hidden pb-2"><NavLinks items={mobileNav} scroller /></div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl w-full px-4 py-6 md:py-10 flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHeader({ title, sub, action, eyebrow }: { title: string; sub?: React.ReactNode; action?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-8">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow text-sky mb-2">{eyebrow}</p>}
        <h1 className="title text-3xl md:text-4xl">{title}</h1>
        {sub && <p className="text-muted mt-2 max-w-2xl">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Empty({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card p-8 md:p-10 text-center">
      {title && <p className="title text-xl mb-2">{title}</p>}
      <div className="text-muted max-w-md mx-auto">{children}</div>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
