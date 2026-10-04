"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { PreviewArt, PreviewView } from "@/components/GamePreview";
import { VIEW_LABEL, viewNote } from "@/components/GamePreview";
import { track } from "@/lib/analytics";

// three.js only loads when someone opens a preview.
const GamePreview = dynamic(() => import("@/components/GamePreview"), {
  ssr: false,
  loading: () => <div className="mx-auto w-full max-w-[340px] aspect-[9/19.5] rounded-[44px] bg-surface-2 grid place-items-center text-sm text-muted">Loading the park…</div>,
});

/** Which preview views make sense for a slot, and which art key it fills. */
export function previewFor(slotId: string, kind: string): { key: keyof PreviewArt; views: PreviewView[] } | null {
  if (kind === "banner") return { key: "banner", views: ["riding", "gate", "wall"] };
  if (slotId.startsWith("rail")) return { key: "rail", views: ["rail", "riding"] };
  if (slotId.startsWith("box")) return { key: "box", views: ["box", "riding"] };
  if (slotId.startsWith("kicker")) return { key: "kicker", views: ["kicker", "riding"] };
  if (kind === "board") return { key: "board", views: ["board", "boardroom"] };
  if (kind === "event_title") return { key: "event", views: ["event"] };
  return null;
}

/**
 * "Preview in game" button + dialog. Shows the art in a 3D copy of the park, and
 * lets the sponsor try a different file locally (nothing uploads) before they commit.
 */
export function PreviewInGame({
  art, views, slotKey, label = "Preview in game", className = "btn btn-sm", size,
}: {
  art: PreviewArt;
  views: PreviewView[];
  slotKey?: keyof PreviewArt;     // set when previewing one placement: enables "Try another file"
  label?: string;
  className?: string;
  size?: { width: number; height: number };
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PreviewView>(views[0]);
  const [trial, setTrial] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => () => { if (trial) URL.revokeObjectURL(trial); }, [trial]);

  const shown: PreviewArt = slotKey && trial ? { ...art, [slotKey]: trial } : art;

  async function tryFile(f: File) {
    setWarn(null);
    if (!["image/png", "image/jpeg"].includes(f.type)) { setWarn("Use a PNG or JPEG file."); return; }
    const url = URL.createObjectURL(f);
    if (size) {
      try {
        const bmp = await createImageBitmap(f);
        if (bmp.width !== size.width || bmp.height !== size.height)
          setWarn(`Previewing anyway, but uploads need exactly ${size.width}×${size.height}px. This file is ${bmp.width}×${bmp.height}px.`);
        bmp.close();
      } catch { /* preview still tries */ }
    }
    setTrial(url);
    track("preview_try_file", { slot: slotKey ?? "" });
  }

  return (
    <>
      <button type="button" className={className}
        onClick={() => { setOpen(true); setView(views[0]); track("preview_opened", { slot: slotKey ?? "all", view: views[0] }); }}>
        {label}
      </button>
      <dialog ref={dialog} onClose={() => setOpen(false)}
        className="m-auto w-[min(920px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] rounded-2xl border border-line bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50">
        {open && (
          <div className="grid md:grid-cols-[minmax(0,340px)_1fr] gap-6 p-4 md:p-6">
            <div className="order-2 md:order-1">
              <GamePreview art={shown} view={view} />
              <p className="text-xs text-muted text-center mt-2">Drag to look around.</p>
            </div>
            <div className="order-1 md:order-2 flex flex-col gap-4 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-muted">IN-GAME PREVIEW</p>
                  <h2 className="title text-2xl">{VIEW_LABEL[view]}</h2>
                </div>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)} aria-label="Close preview">✕</button>
              </div>
              {views.length > 1 && (
                <div role="tablist" aria-label="Views" className="flex flex-wrap gap-2">
                  {views.map((v) => (
                    <button key={v} type="button" role="tab" aria-selected={view === v}
                      className={`btn btn-sm ${view === v ? "btn-primary" : ""}`}
                      onClick={() => { setView(v); track("preview_view", { view: v }); }}>{VIEW_LABEL[v]}</button>
                  ))}
                </div>
              )}
              <p className="text-sm">{viewNote(view)}</p>
              {slotKey && (
                <div className="rounded-lg border border-line bg-surface-2 p-4 grid gap-2">
                  <p className="font-bold text-sm">Try a different file</p>
                  <p className="text-sm text-muted">See another version in the game before you upload it. Nothing is saved until you upload.</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="btn btn-sm cursor-pointer">
                      Choose file
                      <input type="file" accept="image/png,image/jpeg" className="sr-only"
                        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) tryFile(f); }} />
                    </label>
                    {trial && <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setTrial(null); setWarn(null); }}>Back to current art</button>}
                  </div>
                  {trial && <p className="text-xs text-ok">Showing your test file.</p>}
                  {warn && <p className="text-xs text-warn">{warn}</p>}
                </div>
              )}
              <p className="text-xs text-muted mt-auto">
                A close stand-in for the game, built to the same sizes and placement the app uses.
                Lighting and the park layout vary run to run. Placements without your art show our template.
              </p>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
