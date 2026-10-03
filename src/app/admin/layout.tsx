import { requireAdmin } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const s = await requireAdmin();
  const nav = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/applications", label: "Applications" },
    { href: "/admin/review", label: "Review" },
    { href: "/admin/campaigns", label: "Campaigns" },
    { href: "/admin/gear", label: "Gear & challenges" },
    { href: "/admin/house", label: "House ads" },
    { href: "/portal", label: "Sponsor view" },
  ];
  return <Shell area="Admin" nav={nav} email={s.email}>{children}</Shell>;
}
