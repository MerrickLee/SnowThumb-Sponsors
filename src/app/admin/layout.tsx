import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · SnowThumb" } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const s = await requireAdmin();
  const supabase = await createClient();
  const [{ count: apps }, { count: review }] = await Promise.all([
    supabase.from("sponsor_applications").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "submitted"),
  ]);
  const nav = [
    { href: "/admin", label: "Overview", exact: true },
    { href: "/admin/applications", label: "Applications", badge: apps ?? 0 },
    { href: "/admin/review", label: "Review", badge: review ?? 0 },
    { href: "/admin/campaigns", label: "Campaigns" },
    { href: "/admin/gear", label: "Gear & challenges" },
    { href: "/admin/house", label: "House ads" },
    { href: "/portal", label: "Sponsor view", exact: true },
  ];
  return <Shell area="Admin" nav={nav} email={s.email}>{children}</Shell>;
}
