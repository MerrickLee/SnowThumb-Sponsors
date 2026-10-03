import type { Metadata } from "next";
import { SponsorApplyForm } from "@/components/SponsorApplyForm";

export const metadata: Metadata = {
  title: "Sponsor SnowThumb",
  description: "Put your brand on the boards, rails and banners of SnowThumb's indoor snow park.",
};

const PLACEMENTS = [
  { name: "Park banners", spec: "2048×512 · start gate, walls, finish", why: "Seen on every run, from the drop-in to the finish corral." },
  { name: "Feature wraps", spec: "Rail 1024×128 · box 1024×256 · kicker 1024×512", why: "Your logo on the features players aim for." },
  { name: "Sponsored board", spec: "1024×2048 atlas", why: "First person, so players stare at your board the whole run." },
  { name: "Sponsored bindings", spec: "1024×1024 atlas", why: "Visible every run in first person." },
  { name: "Night session title", spec: "1024×256", why: '"Presented by" the after-dark park event.' },
];

export default function ApplyPage() {
  return (
    <main className="mx-auto max-w-5xl w-full px-4 py-12">
      <p className="text-xs font-semibold tracking-[.2em] text-accent uppercase">SnowThumb sponsors</p>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2 max-w-2xl">Put your brand in the park.</h1>
      <p className="text-muted mt-3 max-w-2xl">
        SnowThumb is a first-person snowboarding game set in an indoor snow park. Sponsors get placements players
        actually ride, plus challenges that unlock your board when players land tricks.
      </p>

      <div className="grid md:grid-cols-3 gap-3 mt-8">
        <div className="card p-4"><p className="font-semibold">No app updates</p><p className="text-sm text-muted mt-1">Approved art reaches players on their next app open.</p></div>
        <div className="card p-4"><p className="font-semibold">Earned, not interrupted</p><p className="text-sm text-muted mt-1">Players unlock your gear with tricks. Links never pop up mid-run.</p></div>
        <div className="card p-4"><p className="font-semibold">Real reporting</p><p className="text-sm text-muted mt-1">Impressions, time on screen, unlocks, equips and clicks, updated hourly.</p></div>
      </div>

      <h2 className="text-lg font-semibold mt-10 mb-3">Placements</h2>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Placement</th><th>Art spec (PNG/JPEG)</th><th>Why it works</th></tr></thead>
          <tbody>{PLACEMENTS.map((p) => (
            <tr key={p.name}><td className="font-medium">{p.name}</td><td className="text-muted num text-sm">{p.spec}</td><td className="text-sm">{p.why}</td></tr>
          ))}</tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold mt-10 mb-3">Apply</h2>
      <SponsorApplyForm />
      <p className="text-xs text-muted mt-4">
        We don&apos;t accept alcohol, tobacco, gambling, adult or investment-solicitation creative.
      </p>
    </main>
  );
}
