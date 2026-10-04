"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { easternDayToIso } from "@/lib/format";
import { friendly } from "@/lib/errors";

export type ActionState = { error?: string; ok?: string };

function fields(form: FormData) {
  const s = (k: string) => String(form.get(k) ?? "").trim();
  const link = s("link_url");
  const starts = s("starts_at");
  const ends = s("ends_at");
  return {
    name: s("name"),
    link_url: link ? (/^https?:\/\//i.test(link) ? link.replace(/^http:/i, "https:") : `https://${link}`) : null,
    // Paid campaigns get their dates from checkout, so the form only sends dates when it shows them.
    ...(form.has("starts_at") ? {
      starts_at: starts ? easternDayToIso(starts, "start") : null,
      ends_at: ends ? easternDayToIso(ends, "end") : null,
    } : {}),
    notes: s("notes") || null,
  };
}

export async function createCampaign(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const sponsor_id = String(form.get("sponsor_id") ?? "");
  const f = fields(form);
  if (!f.name) return { error: "Give the campaign a name." };
  if (f.starts_at && f.ends_at && f.ends_at <= f.starts_at) return { error: "The end date needs to be after the start date." };
  const { data, error } = await supabase.from("campaigns").insert({ sponsor_id, ...f }).select("id").single();
  if (error) return { error: friendly(error.message) };
  redirect(`/portal/campaigns/${data.id}?created=1`);
}

export async function updateCampaign(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(form.get("id") ?? "");
  const f = fields(form);
  if (!f.name) return { error: "Give the campaign a name." };
  if (f.starts_at && f.ends_at && f.ends_at <= f.starts_at) return { error: "The end date needs to be after the start date." };
  const { error } = await supabase.from("campaigns").update(f).eq("id", id);
  if (error) return { error: friendly(error.message) };
  revalidatePath(`/portal/campaigns/${id}`);
  return { ok: "Changes saved." };
}

export async function submitCampaign(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(form.get("id") ?? "");
  const { count } = await supabase.from("creatives").select("id", { count: "exact", head: true }).eq("campaign_id", id);
  if (!count) return { error: "Upload art for at least one placement before submitting." };
  const { data: c } = await supabase.from("campaigns").select("link_url").eq("id", id).single();
  if (!c?.link_url) return { error: "Add the link players will visit before submitting." };
  const { error } = await supabase.from("campaigns").update({ status: "submitted" }).eq("id", id);
  if (error) return { error: friendly(error.message) };
  revalidatePath(`/portal/campaigns/${id}`);
  revalidatePath("/portal");
  // Redirect (rather than an inline message) so the sponsor lands at the top and sees the confirmation.
  redirect(`/portal/campaigns/${id}?submitted=1`);
}

export async function deleteDraft(form: FormData) {
  const supabase = await createClient();
  await supabase.from("campaigns").delete().eq("id", String(form.get("id") ?? "")).eq("status", "draft");
  redirect("/portal");
}
