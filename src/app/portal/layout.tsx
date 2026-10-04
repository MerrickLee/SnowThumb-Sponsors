import type { Metadata } from "next";
import { requireSponsor } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { IdentifyUser } from "@/components/IdentifyUser";

export const metadata: Metadata = { title: "Campaigns" };

export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const s = await requireSponsor();
  const nav = [
    { href: "/portal", label: "Campaigns", exact: true },
    { href: "/portal/campaigns/new", label: "New campaign" },
    { href: "/portal/stats", label: "Performance" },
    { href: "/portal/guide", label: "Art guide" },
  ];
  return (
    <Shell area="Sponsor" nav={nav} email={s.email} switchTo={s.isAdmin ? { href: "/admin", label: "Admin" } : undefined}>
      <IdentifyUser userId={s.userId} role={s.isAdmin ? "admin" : "sponsor"} sponsorIds={s.isAdmin ? [] : s.sponsors.map((x) => x.id)} />
      {children}
    </Shell>
  );
}
