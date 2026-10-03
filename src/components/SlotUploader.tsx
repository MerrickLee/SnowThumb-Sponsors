"use client";

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

/**
 * One row per slot: shows current art (signed preview), validates a new file
 * in the browser (type, exact size, max bytes), uploads it to sponsor-uploads,
 * and saves the creative as pending. The server re-checks on approval.
 */
export function SlotUploader({
  sponsorId, campaignId, slots, creatives, previews, editable,
}: {
  sponsorId: string;
  campaignId: string;
  slots: Slot[];
  creatives: Creative[];
  previews: Record<string, string>;
  editable: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [local, setLocal] = useState<Record<string, string>>({});
  const bySlot = Object.fromEntries(creatives.map((c) => [c.slot_id, c]));

  async function upload(slot: Slot, file: File) {
    setErrors((e) => ({ ...e, [slot.id]: "" }));
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      return setErrors((e) => ({ ...e, [slot.id]: "Use a PNG or JPEG." }));
    }
    if (file.size > slot.max_bytes) {
      return setErrors((e) => ({ ...e, [slot.id]: `File is ${Math.round(file.size / 1024)} KB. Max is ${Math.round(slot.max_bytes / 1024)} KB.` }));
    }
    const { width, height } = await readDims(file);
    if (width !== slot.width || height !== slot.height) {
      return setErrors((e) => ({ ...e, [slot.id]: `Must be exactly ${slot.width}×${slot.height}px. This file is ${width}×${height}px.` }));
    }

    setBusy(slot.id);
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${sponsorId}/${campaignId}/${slot.id}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("sponsor-uploads").upload(path, file, {
      contentType: file.type, upsert: false,
    });
    if (upErr) {
      setBusy(null);
      return setErrors((e) => ({ ...e, [slot.id]: `Upload failed: ${upErr.message}` }));
    }

    const { error: dbErr } = await supabase.from("creatives").upsert(
      {
        campaign_id: campaignId, sponsor_id: sponsorId, slot_id: slot.id, upload_path: path,
        status: "pending", live_path: null, public_url: null, sha256: null,
      },
      { onConflict: "campaign_id,slot_id" },
    );
    setBusy(null);
    if (dbErr) return setErrors((e) => ({ ...e, [slot.id]: dbErr.message }));
    setLocal((l) => ({ ...l, [slot.id]: URL.createObjectURL(file) }));
    router.refresh();
  }

  async function remove(slot: Slot) {
    const c = bySlot[slot.id];
    if (!c) return;
    setBusy(slot.id);
    const { error } = await createClient().from("creatives").delete().eq("id", c.id);
    setBusy(null);
    if (error) return setErrors((e) => ({ ...e, [slot.id]: error.message }));
    setLocal((l) => { const n = { ...l }; delete n[slot.id]; return n; });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {slots.map((slot) => {
        const c = bySlot[slot.id];
        const src = local[slot.id] ?? (c ? previews[c.id] : undefined);
        return (
          <div key={slot.id} className="card p-4 grid md:grid-cols-[1fr_320px] gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{slot.label}</h3>
                <span className="text-xs text-muted">{SLOT_KIND_LABEL[slot.kind]}</span>
                {c && <StatusBadge status={c.status} />}
              </div>
              {slot.description && <p className="text-sm text-muted mt-1">{slot.description}</p>}
              <p className="text-sm mt-2 num">
                Exactly <strong>{slot.width}×{slot.height}px</strong>, PNG or JPEG, up to {Math.round(slot.max_bytes / 1024)} KB.
                {slot.template_url && <> <a className="link" href={slot.template_url} target="_blank" rel="noreferrer">Download template</a></>}
              </p>
              {c?.review_notes && <p className="text-sm text-warn mt-2">Reviewer: {c.review_notes}</p>}
              {editable && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <label className={`btn btn-sm ${busy === slot.id ? "opacity-50 pointer-events-none" : ""}`}>
                    {busy === slot.id ? "Uploading…" : c ? "Replace file" : "Upload file"}
                    <input type="file" accept="image/png,image/jpeg" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(slot, f); }} />
                  </label>
                  {c && c.status === "pending" && (
                    <button className="btn btn-sm btn-danger" disabled={busy === slot.id} onClick={() => remove(slot)}>Remove</button>
                  )}
                </div>
              )}
              {errors[slot.id] && <p className="text-sm text-bad mt-2">{errors[slot.id]}</p>}
            </div>
            <SlotMockup slot={slot} src={src} />
          </div>
        );
      })}
    </div>
  );
}
