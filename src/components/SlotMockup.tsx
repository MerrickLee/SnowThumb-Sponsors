/* eslint-disable @next/next/no-img-element */
import type { Slot } from "@/lib/types";

/**
 * Lightweight in-context preview. Banners sit on a hall wall, wraps on a
 * feature, boards on a board outline. It's a framing aid, not a render.
 */
export function SlotMockup({ slot, src }: { slot: Slot; src?: string }) {
  const ratio = `${slot.width} / ${slot.height}`;

  if (slot.kind === "board") {
    return (
      <div className="rounded-lg bg-bg border border-line p-3 grid place-items-center">
        <div className="relative overflow-hidden" style={{ aspectRatio: ratio, height: 200, borderRadius: "48% / 12%", background: "#1d2a45" }}>
          {src ? <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Placeholder />}
        </div>
        <p className="text-xs text-muted mt-2">Board atlas preview (top + base)</p>
      </div>
    );
  }

  if (slot.kind === "binding") {
    return (
      <div className="rounded-lg bg-bg border border-line p-3 grid place-items-center">
        <div className="relative overflow-hidden rounded-md w-40" style={{ aspectRatio: ratio, background: "#1d2a45" }}>
          {src ? <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Placeholder />}
        </div>
        <p className="text-xs text-muted mt-2">Strap + highback atlas</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line p-3" style={{ background: "linear-gradient(#141e33, #0d1527 70%, #e9eef7 70%, #cfd9ea)" }}>
      <div className="relative overflow-hidden rounded-sm shadow-lg ring-1 ring-black/40" style={{ aspectRatio: ratio, background: "#1d2a45" }}>
        {src ? <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Placeholder />}
      </div>
      <p className="text-xs text-muted mt-2">{slot.kind === "banner" ? "Hall wall" : slot.kind === "event_title" ? "Night-session title card" : "Feature surface"} preview</p>
    </div>
  );
}

function Placeholder() {
  return <div className="absolute inset-0 grid place-items-center text-xs text-muted">No art yet</div>;
}
