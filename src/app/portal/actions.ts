"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { easternDayToIso } from "@/lib/format";
import { friendly } from "@/lib/errors";

export type ActionState = { error?: string; ok?: string; code?: string };

function hexColor(val: string): string | null {
  const v = val.trim();
  if (!v) return null;
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) {
    throw new Error(`Color "${val}" is invalid. Colors must be in #RRGGBB format.`);
  }
  return v.toLowerCase();
}

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
    // Only sent by forms that show the Gear Room fields.
    ...(form.has("board_name") ? {
      board_name: s("board_name").slice(0, 32) || null,
      board_tagline: s("board_tagline").slice(0, 90) || null,
    } : {}),
    ...(form.has("binding_name") || form.has("binding_frame") ? {
      binding_name: s("binding_name").slice(0, 32) || null,
      binding_tagline: s("binding_tagline").slice(0, 90) || null,
      binding_style: (["step_on", "strap"].includes(s("binding_style")) ? s("binding_style") : "strap") as "step_on" | "strap",
      binding_frame: hexColor(s("binding_frame")),
      binding_strap: hexColor(s("binding_strap")),
      binding_accent: hexColor(s("binding_accent")),
      boot_name: s("boot_name").slice(0, 32) || null,
      boot_tagline: s("boot_tagline").slice(0, 90) || null,
      boot_shell: hexColor(s("boot_shell")),
      boot_trim: hexColor(s("boot_trim")),
      boot_laces: hexColor(s("boot_laces")),
      boot_sole: hexColor(s("boot_sole")),
    } : {}),
  };
}

export async function createCampaign(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const sponsor_id = String(form.get("sponsor_id") ?? "");
  let f;
  try {
    f = fields(form);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Invalid gear configuration." };
  }
  if (!f.name) return { error: "Give the campaign a name." };
  if (f.starts_at && f.ends_at && f.ends_at <= f.starts_at) return { error: "The end date needs to be after the start date." };
  const { data, error } = await supabase.from("campaigns").insert({ sponsor_id, ...f }).select("id").single();
  if (error) return { error: friendly(error.message) };
  redirect(`/portal/campaigns/${data.id}?created=1`);
}

export async function updateCampaign(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(form.get("id") ?? "");
  let f;
  try {
    f = fields(form);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Invalid gear configuration." };
  }
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
