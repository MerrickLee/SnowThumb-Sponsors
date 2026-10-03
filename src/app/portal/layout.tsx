import { requireSponsor } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const s = await requireSponsor();
  const nav = [
    { href: "/portal", label: "Campaigns" },
    { href: "/portal/stats", label: "Performance" },
    ...(s.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  return <Shell area="Sponsor" nav={nav} email={s.email}>{children}</Shell>;
}
