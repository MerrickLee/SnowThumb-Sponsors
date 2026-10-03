"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { easternDayToIso } from "@/lib/format";

export type ActionState = { error?: string; ok?: string };

function fields(form: FormData) {
  const s = (k: string) => String(form.get(k) ?? "").trim();
  const link = s("link_url");
  const starts = s("starts_at");
  const ends = s("ends_at");
  return {
    name: s("name"),
    link_url: link ? (/^https?:\/\//i.test(link) ? link.replace(/^http:/i, "https:") : `https://${link}`) : null,
    starts_at: starts ? easternDayToIso(starts, "start") : null,
    ends_at: ends ? easternDayToIso(ends, "end") : null,
    notes: s("notes") || null,
  };
}

export async function createCampaign(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const sponsor_id = String(form.get("sponsor_id") ?? "");
  const f = fields(form);
  if (!f.name) return { error: "Give the campaign a name." };
  const { data, error } = await supabase.from("campaigns").insert({ sponsor_id, ...f }).select("id").single();
  if (error) return { error: error.message };
  redirect(`/portal/campaigns/${data.id}`);
}

export async function updateCampaign(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(form.get("id") ?? "");
  const f = fields(form);
  if (!f.name) return { error: "Give the campaign a name." };
  const { error } = await supabase.from("campaigns").update(f).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/portal/campaigns/${id}`);
  return { ok: "Saved." };
}

export async function submitCampaign(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(form.get("id") ?? "");
  const { count } = await supabase.from("creatives").select("id", { count: "exact", head: true }).eq("campaign_id", id);
  if (!count) return { error: "Upload art for at least one placement before submitting." };
  const { data: c } = await supabase.from("campaigns").select("link_url").eq("id", id).single();
  if (!c?.link_url) return { error: "Add the link players will visit before submitting." };
  const { error } = await supabase.from("campaigns").update({ status: "submitted" }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/portal/campaigns/${id}`);
  revalidatePath("/portal");
  return { ok: "Submitted. We'll review it and you'll see the status change here." };
}

export async function deleteDraft(form: FormData) {
  const supabase = await createClient();
  await supabase.from("campaigns").delete().eq("id", String(form.get("id") ?? "")).eq("status", "draft");
  redirect("/portal");
}
