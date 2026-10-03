/* eslint-disable @next/next/no-img-element */
import type { Slot } from "@/lib/types";

/**
 * In-context framing aid: banners on the hall wall, wraps on a feature,
 * boards as the board shape. Not a render of the game.
 */
export function SlotMockup({ slot, src }: { slot: Slot; src?: string }) {
  const ratio = `${slot.width} / ${slot.height}`;
  const art = src
    ? <img src={src} alt={`${slot.label} artwork`} className="absolute inset-0 w-full h-full object-cover" />
    : <div className="absolute inset-0 grid place-items-center text-xs text-muted text-center px-2">No art yet</div>;

  if (slot.kind === "board") {
    return (
      <figure className="rounded-lg bg-surface-2 border border-line p-4 flex items-center gap-4">
        <div className="relative overflow-hidden mx-auto shrink-0 bg-white ring-2 ring-[var(--text)]" style={{ aspectRatio: ratio, height: 220, borderRadius: "999px" }}>{art}</div>
        <figcaption className="text-xs text-muted">Board top sheet, nose at the top. This is what players see under their feet in first person.</figcaption>
      </figure>
    );
  }

  if (slot.kind === "binding") {
    return (
      <figure className="rounded-lg bg-surface-2 border border-line p-4">
        <div className="relative overflow-hidden rounded-md w-40 mx-auto bg-white" style={{ aspectRatio: ratio }}>{art}</div>
        <figcaption className="text-xs text-muted mt-2 text-center">Strap and highback</figcaption>
      </figure>
    );
  }

  const where = slot.kind === "banner" ? "On the hall wall" : slot.kind === "event_title" ? "Night session title card" : "On the feature";
  return (
    <figure className="rounded-lg border border-line p-3 bg-[linear-gradient(#dbe9f7,#eef5fc_68%,#ffffff_68%,#f2f7fc)]">
      <div className="relative overflow-hidden rounded-sm bg-white shadow-md ring-1 ring-[var(--line-strong)]" style={{ aspectRatio: ratio }}>{art}</div>
      <figcaption className="text-xs text-muted mt-2">{where}</figcaption>
    </figure>
  );
}
