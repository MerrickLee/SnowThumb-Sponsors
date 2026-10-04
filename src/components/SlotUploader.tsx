"use client";

import { track } from "@/lib/analytics";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Creative, Slot } from "@/lib/types";
import { SLOT_KIND_LABEL } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SlotMockup } from "@/components/SlotMockup";

async function readDims(file: File) {
  const bmp = await createImageBitmap(file);
  const dims = { width: bmp.width, height: bmp.height };
  bmp.close();
  return dims;
}

type Msg = { tone: "ok" | "bad"; text: string };

/**
 * One card per placement: shows current art, validates a new file in the
 * browser (type, exact size, max bytes), uploads to sponsor-uploads and
 * saves the creative as pending. The server re-checks on approval.
 */
export function SlotUploader({
  sponsorId, campaignId, slots, creatives, previews, editable,
}: {
  sponsorId: string; campaignId: string; slots: Slot[]; creatives: Creative[];
  previews: Record<string, string>; editable: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, Msg>>({});
  const [local, setLocal] = useState<Record<string, string>>({});
  const [over, setOver] = useState<string | null>(null);
  const bySlot = Object.fromEntries(creatives.map((c) => [c.slot_id, c]));

  // Banner package: every banner in the park is the same size and one brand owns them all,
  // so the sponsor uploads one file and it's saved for every banner slot.
  const bannerIds = slots.filter((s) => s.kind === "banner").map((s) => s.id);
  const targets: Record<string, string[]> = {};
  const units: Slot[] = [];
  for (const sl of slots) {
    if (sl.kind === "banner" && bannerIds.length > 1) {
      if (sl.id !== bannerIds[0]) continue;
      targets[sl.id] = bannerIds;
      units.push({ ...sl, label: "Banner package", description: "One file runs on every banner in the park: overhead, both walls and the finish wall. No other brand shares them while you're on." });
    } else {
      units.push(sl);
    }
  }
  const creativeFor = (sl: Slot) => bySlot[sl.id] ?? (targets[sl.id] ?? []).map((id) => bySlot[id]).find(Boolean);
  const say = (id: string, m: Msg | null) => setMsg((x) => { const n = { ...x }; if (m) n[id] = m; else delete n[id]; return n; });

  async function upload(slot: Slot, file: File) {
    say(slot.id, null);
    const fail = (result: string, m: Msg) => { track("art_uploaded", { slot_id: slot.id, slot_kind: slot.kind, result }); return say(slot.id, m); };
    if (!["image/png", "image/jpeg"].includes(file.type)) return fail("wrong_type", { tone: "bad", text: "Use a PNG or JPEG file." });
    if (file.size > slot.max_bytes) {
      return fail("too_big", { tone: "bad", text: `This file is ${Math.round(file.size / 1024)} KB. The limit is ${Math.round(slot.max_bytes / 1024)} KB. Try exporting as JPEG or compressing it.` });
    }
    let dims;
    try { dims = await readDims(file); } catch { return say(slot.id, { tone: "bad", text: "We couldn't read that image. Re-export it as PNG or JPEG." }); }
    if (dims.width !== slot.width || dims.height !== slot.height) {
      return fail("wrong_size", { tone: "bad", text: `Needs to be exactly ${slot.width}×${slot.height}px. Yours is ${dims.width}×${dims.height}px. Use the template to resize.` });
    }

    setBusy(slot.id);
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${sponsorId}/${campaignId}/${slot.id}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("sponsor-uploads").upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) { setBusy(null); return say(slot.id, { tone: "bad", text: `Upload failed: ${upErr.message}. Try again.` }); }

    const { error: dbErr } = await supabase.from("creatives").upsert(
      (targets[slot.id] ?? [slot.id]).map((slot_id) => (
        { campaign_id: campaignId, sponsor_id: sponsorId, slot_id, upload_path: path, status: "pending", live_path: null, public_url: null, sha256: null })),
      { onConflict: "campaign_id,slot_id" },
    );
    setBusy(null);
    if (dbErr) return say(slot.id, { tone: "bad", text: dbErr.message });
    setLocal((l) => ({ ...l, [slot.id]: URL.createObjectURL(file) }));
    track("art_uploaded", { slot_id: slot.id, slot_kind: slot.kind, result: "ok" });
    say(slot.id, { tone: "ok", text: "Uploaded. It'll be reviewed when you submit." });
    router.refresh();
  }

  async function remove(slot: Slot) {
    const c = creativeFor(slot);
    if (!c) return;
    setBusy(slot.id);
    const { error } = await createClient().from("creatives").delete()
      .eq("campaign_id", campaignId).in("slot_id", targets[slot.id] ?? [slot.id]);
    setBusy(null);
    if (error) return say(slot.id, { tone: "bad", text: error.message });
    setLocal((l) => { const n = { ...l }; delete n[slot.id]; return n; });
    say(slot.id, null);
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {units.map((slot) => {
        const c = creativeFor(slot);
        const src = local[slot.id] ?? (c ? previews[c.id] : undefined);
        const m = msg[slot.id];
        const isBusy = busy === slot.id;
        const inputId = `file-${slot.id}`;
        return (
          <article key={slot.id}
            className={`card p-4 grid gap-3 transition-colors ${c ? "border-accent/40" : ""} ${over === slot.id ? "ring-2 ring-[var(--accent)]" : ""}`}
            onDragOver={editable ? (e) => { e.preventDefault(); setOver(slot.id); } : undefined}
            onDragLeave={editable ? () => setOver(null) : undefined}
            onDrop={editable ? (e) => { e.preventDefault(); setOver(null); const f = e.dataTransfer.files?.[0]; if (f) upload(slot, f); } : undefined}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-bold">{slot.label}</h3>
                <p className="text-xs text-muted">{SLOT_KIND_LABEL[slot.kind]} · <span className="num">{slot.width}×{slot.height}px</span> · {Math.round(slot.max_bytes / 1024)} KB max</p>
                {targets[slot.id] && <p className="text-sm text-muted mt-1 max-w-md">{slot.description}</p>}
                {slot.kind === "feature_wrap" && <p className="text-xs text-muted mt-1">Feature package: one file per feature size. Your brand owns every rail, box and kicker.</p>}
              </div>
              {c && <StatusBadge status={c.status} />}
            </div>

            <SlotMockup slot={slot} src={src} />

            {c?.review_notes && c.status === "rejected" && <p className="notice notice-warn">Reviewer: {c.review_notes}</p>}

            {editable && (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={inputId} className={`btn btn-sm ${c ? "" : "btn-primary"} ${isBusy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
                  {isBusy ? "Uploading…" : c ? "Replace file" : "Upload file"}
                </label>
                <input id={inputId} type="file" accept="image/png,image/jpeg" className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(slot, f); }} />
                {c && c.status === "pending" && (
                  <button className="btn btn-sm btn-ghost text-bad" disabled={isBusy} onClick={() => remove(slot)}>Remove</button>
                )}
                {slot.template_url && <a className="btn btn-sm btn-ghost" href={slot.template_url} download onClick={() => track("template_downloaded", { slot_id: slot.id, area: "campaign" })}>Template</a>}
                <span className="text-xs text-muted hidden md:inline">or drop a file here</span>
              </div>
            )}
            <div aria-live="polite">{m && <p className={`text-sm ${m.tone === "ok" ? "text-ok" : "text-bad"}`} role={m.tone === "bad" ? "alert" : undefined}>{m.text}</p>}</div>
          </article>
        );
      })}
    </div>
  );
}
