import { TrackedLink } from "@/components/Track";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/Shell";
import { SlotMockup } from "@/components/SlotMockup";
import { KIND_PITCH, groupByKind } from "@/lib/publicSlots";
import type { Slot } from "@/lib/types";

export const metadata: Metadata = { title: "Art guide" };

const DO = [
  "Export at the exact pixel size listed. We check it before upload.",
  "Keep logos and text inside the safe zone on the template.",
  "Use bold, high-contrast marks. Players see banners at speed and at a distance.",
  "Keep text short: a logo plus up to five words reads best.",
  "PNG for logos and flat art, JPEG for photos. Max file size is listed per placement.",
];
const DONT = [
  "Small text, fine lines, or QR codes. They won't be readable in-game.",
  "Alcohol, tobacco, vaping, gambling, adult, or investment-solicitation content.",
  "Claims about returns, prices or offers that need legal disclaimers.",
  "Other brands' logos or characters you don't have rights to.",
];

export default async function Guide() {
  const supabase = await createClient();
  const { data } = await supabase.from("slots").select("*").eq("sellable", true).order("sort");
  const groups = groupByKind((data ?? []) as Slot[]);

  return (
    <>
      <PageHeader eyebrow="Art guide" title="Make art that reads at speed."
        sub="Specs, templates and rules for every placement. Download a template, design inside the safe zone, and export at the exact size." />

      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <div className="card p-5">
          <h2 className="font-bold text-lg text-ok">Do</h2>
          <ul className="mt-3 space-y-2 text-sm">{DO.map((d) => <li key={d} className="flex gap-2"><span aria-hidden className="text-ok font-black">✓</span>{d}</li>)}</ul>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-lg text-bad">Don&apos;t</h2>
          <ul className="mt-3 space-y-2 text-sm">{DONT.map((d) => <li key={d} className="flex gap-2"><span aria-hidden className="text-bad font-black">✕</span>{d}</li>)}</ul>
        </div>
      </div>

      {groups.map(({ kind, slots }) => (
        <section key={kind} className="mb-10">
          <h2 className="title text-2xl">{KIND_PITCH[kind]?.title ?? kind}</h2>
          <p className="text-muted mt-1 mb-4">{KIND_PITCH[kind]?.why}</p>
          <div className="grid md:grid-cols-2 gap-4">
            {slots.map((s) => (
              <article key={s.id} className="card p-4 grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold">{s.label}</h3>
                  <span className="text-sm text-muted num">{s.width}×{s.height}px · {Math.round(s.max_bytes / 1024)} KB max</span>
                </div>
                {s.description && <p className="text-sm text-muted">{s.description}</p>}
                <SlotMockup slot={s} src={s.template_url ?? undefined} />
                {s.template_url && (
                  <TrackedLink event="template_downloaded" props={{ slot_id: s.id, area: "guide" }} className="btn btn-sm self-start" href={s.template_url} download>Download template</TrackedLink>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
