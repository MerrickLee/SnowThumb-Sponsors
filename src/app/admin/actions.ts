"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { easternDayToIso } from "@/lib/format";

export type AdminState = { error?: string; ok?: string };

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "sponsor";

/* ---------------- Applications ---------------- */

export async function setApplicationStatus(form: FormData) {
  const s = await requireAdmin();
  const supabase = await createClient();
  const status = String(form.get("status"));
  if (!["contacted", "declined", "new"].includes(status)) return;
  await supabase.from("sponsor_applications").update({
    status, reviewed_by: s.userId, reviewed_at: new Date().toISOString(),
  }).eq("id", String(form.get("id")));
  revalidatePath("/admin/applications");
}

/** Creates the sponsor, invites the contact by email, links them, marks the application accepted. */
export async function acceptApplication(_: AdminState, form: FormData): Promise<AdminState> {
  const s = await requireAdmin();
  const supabase = await createClient();
  const id = String(form.get("id"));
  const { data: app } = await supabase.from("sponsor_applications").select("*").eq("id", id).single();
  if (!app) return { error: "Application not found." };
  if (app.status === "accepted") return { error: "Already accepted." };

  // 1. Sponsor row (unique slug)
  let slug = slugify(app.company_name);
  const { data: clash } = await supabase.from("sponsors").select("slug").like("slug", `${slug}%`);
  if (clash?.some((c) => c.slug === slug)) slug = `${slug}-${(clash.length + 1).toString()}`;
  const { data: sponsor, error: sErr } = await supabase.from("sponsors").insert({
    name: app.company_name, slug, website_url: app.website_url,
    contact_name: app.contact_name, contact_email: app.contact_email,
  }).select("id").single();
  if (sErr || !sponsor) return { error: sErr?.message ?? "Could not create sponsor." };

  // 2. Invite (or find) the auth user. Needs the service role.
  const admin = createAdminClient();
  let userId: string | null = null;
  const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(app.contact_email, {
    redirectTo: `${env.siteUrl}/portal`,
    data: { sponsor_id: sponsor.id },
  });
  if (invited?.user) userId = invited.user.id;
  else if (invErr && /already|registered|exists/i.test(invErr.message)) {
    for (let page = 1; page <= 10 && !userId; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      userId = data?.users.find((u) => u.email?.toLowerCase() === app.contact_email.toLowerCase())?.id ?? null;
      if (!data || data.users.length < 200) break;
    }
  }
  if (!userId) return { error: `Sponsor created, but the invite failed: ${invErr?.message ?? "unknown error"}` };

  // 3. Link + mark accepted
  const { error: mErr } = await supabase.from("sponsor_members").insert({ sponsor_id: sponsor.id, user_id: userId, role: "owner" });
  if (mErr && !/duplicate/i.test(mErr.message)) return { error: mErr.message };
  await supabase.from("sponsor_applications").update({
    status: "accepted", sponsor_id: sponsor.id, reviewed_by: s.userId, reviewed_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath("/admin/applications");
  return { ok: invited?.user ? `Invite sent to ${app.contact_email}.` : `${app.contact_email} already had an account and is now linked.` };
}

/* ---------------- Campaigns ---------------- */

export async function updateCampaignAdmin(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const supabase = await createClient();
  const g = (k: string) => String(form.get(k) ?? "").trim();
  const starts = g("starts_at"), ends = g("ends_at");
  const { error } = await supabase.from("campaigns").update({
    priority: Number(g("priority") || 10),
    weight: Math.min(1000, Math.max(1, Number(g("weight") || 100))),
    starts_at: starts ? easternDayToIso(starts, "start") : null,
    ends_at: ends ? easternDayToIso(ends, "end") : null,
  }).eq("id", g("id"));
  if (error) return { error: error.message };
  revalidatePath("/admin/campaigns");
  return { ok: "Saved." };
}

/** Pause / resume / archive without touching creatives. Approval goes through the review function. */
export async function setCampaignStatus(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const status = String(form.get("status"));
  if (!["paused", "approved", "archived"].includes(status)) return;
  const id = String(form.get("id"));
  if (status === "approved") {
    // Resume only campaigns that were approved before (they have published art).
    const { data } = await supabase.from("campaigns").select("approved_at").eq("id", id).single();
    if (!data?.approved_at) return;
  }
  await supabase.from("campaigns").update({ status }).eq("id", id);
  revalidatePath("/admin/campaigns");
}

export async function createHouseCampaign(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const supabase = await createClient();
  const sponsor_id = String(form.get("sponsor_id"));
  const name = String(form.get("name") ?? "").trim();
  const link = String(form.get("link_url") ?? "").trim();
  if (!name) return { error: "Name it." };
  const { data, error } = await supabase.from("campaigns").insert({
    sponsor_id, name, status: "draft", priority: 0, weight: 100,
    link_url: link ? (link.startsWith("https://") ? link : `https://${link.replace(/^https?:\/\//, "")}`) : null,
  }).select("id").single();
  if (error) return { error: error.message };
  redirect(`/portal/campaigns/${data.id}?created=1`);
}

/* ---------------- Gear & challenges ---------------- */

const intOrNull = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? null : Number(v));

export async function saveGear(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const supabase = await createClient();
  const g = (k: string) => String(form.get(k) ?? "").trim();
  const unlock = g("unlock");
  const creative_id = g("creative_id") || null;
  let sponsor_id = g("sponsor_id") || null;
  let campaign_id: string | null = null;
  if (creative_id) {
    const { data: cr } = await supabase.from("creatives").select("campaign_id, sponsor_id").eq("id", creative_id).single();
    campaign_id = cr?.campaign_id ?? null;
    sponsor_id = cr?.sponsor_id ?? sponsor_id;
  }
  const row = {
    id: g("id"),
    kind: g("kind"),
    base_model_id: g("base_model_id"),
    name: g("name"),
    tagline: g("tagline") || null,
    sponsor_id, campaign_id, creative_id,
    unlock,
    cred_price: unlock === "cred" ? intOrNull(form.get("cred_price")) : null,
    score_threshold: unlock === "score" ? intOrNull(form.get("score_threshold")) : null,
    iap_product_id: unlock === "iap" ? g("iap_product_id") || null : null,
    keep_after_end: form.get("keep_after_end") === "on",
    sort: Number(g("sort") || 0),
    active: true,
  };
  if (!/^[a-z0-9_]{3,64}$/.test(row.id)) return { error: "ID must be 3-64 chars: lowercase letters, numbers, underscores. It's stored in player saves, so pick it once." };
  if (!row.name || !row.base_model_id) return { error: "Name and base model are required." };
  const { error } = await supabase.from("gear_items").upsert(row);
  if (error) return { error: error.message };
  revalidatePath("/admin/gear");
  return { ok: `Saved ${row.id}.` };
}

export async function toggleGear(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("gear_items").update({ active: form.get("active") === "true" }).eq("id", String(form.get("id")));
  revalidatePath("/admin/gear");
}

export async function saveChallenge(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const supabase = await createClient();
  const g = (k: string) => String(form.get(k) ?? "").trim();
  const reward = g("reward_gear_id") || null;
  let sponsor_id = g("sponsor_id") || null;
  let campaign_id: string | null = null;
  if (reward) {
    const { data: gear } = await supabase.from("gear_items").select("sponsor_id, campaign_id").eq("id", reward).single();
    sponsor_id = gear?.sponsor_id ?? sponsor_id;
    campaign_id = gear?.campaign_id ?? null;
  }
  const starts = g("starts_at"), ends = g("ends_at");
  const { error } = await supabase.from("challenges").insert({
    title: g("title"), description: g("description") || null,
    scope: g("scope"), feature: g("feature"), trick: g("trick") || "any",
    target_count: Math.max(1, Number(g("target_count") || 1)),
    min_points: Math.max(0, Number(g("min_points") || 0)),
    reward_gear_id: reward, sponsor_id, campaign_id,
    starts_at: starts ? easternDayToIso(starts, "start") : null,
    ends_at: ends ? easternDayToIso(ends, "end") : null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/gear");
  return { ok: "Challenge added." };
}

export async function toggleChallenge(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("challenges").update({ active: form.get("active") === "true" }).eq("id", String(form.get("id")));
  revalidatePath("/admin/gear");
}
