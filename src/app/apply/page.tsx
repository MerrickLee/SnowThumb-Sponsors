import { TrackOnView } from "@/components/Track";
import type { Metadata } from "next";
import Image from "next/image";
import { SponsorApplyForm } from "@/components/SponsorApplyForm";
import { Footer, Logo } from "@/components/Brand";
import { KIND_PITCH, getSellableSlots, groupByKind } from "@/lib/publicSlots";

export const metadata: Metadata = {
  title: "Sponsor SnowThumb",
  description: "Put your brand on the boards, rails and banners of SnowThumb's indoor snow park. Approved art goes live without an app update.",
};

export const revalidate = 300;

const STEPS = [
  { n: "01", t: "Apply", d: "Tell us about your brand and what you want to sponsor. Takes two minutes." },
  { n: "02", t: "Upload your art", d: "We invite you to the sponsor console. Upload art per placement; sizes are checked as you go." },
  { n: "03", t: "Go live", d: "We approve it and it reaches players on their next app open. No app update." },
  { n: "04", t: "Track results", d: "Impressions, time on screen, unlocks, equips and clicks, updated hourly." },
];

export default async function ApplyPage() {
  const groups = groupByKind(await getSellableSlots());

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-line bg-surface/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
          <Logo height={22} href="https://snowthumb.com" />
          <div className="flex items-center gap-2">
            <a href="/login" className="btn btn-sm btn-ghost"><span className="sm:hidden">Sign in</span><span className="hidden sm:inline">Sponsor sign in</span></a>
            <a href="#apply" className="btn btn-sm btn-primary">Apply</a>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-10 md:pt-16 pb-12 grid md:grid-cols-[1.1fr_1fr] gap-10 items-center [&>*]:min-w-0">
          <div>
            <p className="eyebrow">Sponsor the park</p>
            <h1 className="display text-5xl md:text-7xl mt-4">
              Your brand,<br />under every <span className="text-sky">rider.</span>
            </h1>
            <p className="text-lg text-muted mt-5 max-w-xl">
              SnowThumb is a first-person snowboarding game set in an indoor snow park. Sponsors get placements players
              actually ride: boards under their feet, banners on the walls, and challenges that unlock your gear when they land tricks.
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <a href="#apply" className="btn btn-primary">Apply to sponsor</a>
              <a href="#placements" className="btn">See placements</a>
            </div>
            <ul className="mt-8 grid sm:grid-cols-3 gap-3 text-sm">
              {[
                ["No app updates", "Approved art is live on the next app open."],
                ["Never mid-run", "Links only open from the shop or post-run card."],
                ["Hourly reporting", "Impressions, unlocks, equips, clicks."],
              ].map(([t, d]) => (
                <li key={t} className="card p-3.5">
                  <p className="font-bold">{t}</p>
                  <p className="text-muted mt-0.5">{d}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative flex justify-center gap-4 md:gap-6 overflow-hidden md:overflow-visible py-4" aria-hidden="true">
            <Phone src="/brand/gameplay-board.jpg" alt="" className="rotate-[-4deg] translate-y-4" priority />
            <Phone src="/brand/board-room.jpg" alt="" className="rotate-[4deg] -translate-y-2 hidden sm:block" />
          </div>
        </section>

        {/* How it works */}
        <section className="bg-surface border-y border-line">
          <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
            <p className="eyebrow">How it works</p>
            <h2 className="title text-3xl md:text-4xl mt-2">From application to live in days.</h2>
            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-xl border border-line p-5 bg-bg">
                  <p className="text-sky font-black text-2xl num">{s.n}</p>
                  <p className="font-bold text-lg mt-2">{s.t}</p>
                  <p className="text-muted mt-1 text-sm">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Placements */}
        <section id="placements" className="mx-auto max-w-6xl px-4 py-12 md:py-16 scroll-mt-16">
          <p className="eyebrow">Placements</p>
          <h2 className="title text-3xl md:text-4xl mt-2">Where your brand shows up.</h2>
          <p className="text-muted mt-2 max-w-2xl">All art is PNG or JPEG at the exact size listed. The console checks sizes before you upload, and every placement comes with a downloadable template.</p>
          <div className="grid md:grid-cols-2 gap-4 mt-8 [&>*]:min-w-0">
            {groups.map(({ kind, slots }) => (
              <TrackOnView key={kind} event="placement_viewed" props={{ slot_kind: kind }} className="card p-5">
                <h3 className="font-bold text-lg">{KIND_PITCH[kind]?.title ?? kind}</h3>
                <p className="text-muted text-sm mt-1">{KIND_PITCH[kind]?.why}</p>
                <ul className="mt-4 divide-y divide-line text-sm">
                  {slots.map((s) => (
                    <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                      <span>{s.label}</span>
                      <span className="text-muted num whitespace-nowrap">{s.width}×{s.height}px</span>
                    </li>
                  ))}
                </ul>
              </TrackOnView>
            ))}
            <article className="card p-5 bg-accent-soft border-accent/20">
              <h3 className="font-bold text-lg">Sponsor challenges</h3>
              <p className="text-sm mt-1">
                Pair a sponsored board with a challenge, like &ldquo;land 5 boardslides on rails in one run&rdquo;. Players earn your gear by riding, which beats any banner for attention.
              </p>
            </article>
          </div>
        </section>

        {/* Apply */}
        <section id="apply" className="bg-surface border-t border-line scroll-mt-16">
          <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
            <p className="eyebrow">Apply</p>
            <h2 className="title text-3xl md:text-4xl mt-2">Tell us about your brand.</h2>
            <p className="text-muted mt-2">We review every sponsor personally and reply by email.</p>
            <div className="mt-8"><SponsorApplyForm /></div>
            <p className="text-sm text-muted mt-6">
              We don&apos;t accept alcohol, tobacco, vaping, gambling, adult, or investment-solicitation creative.
              Questions? <a className="link" href="mailto:sponsors@snowthumb.com">sponsors@snowthumb.com</a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Phone({ src, alt, className = "", priority }: { src: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={`w-[52%] sm:w-[46%] max-w-[200px] sm:max-w-[240px] shrink-0 rounded-[2rem] border-[6px] border-text bg-text shadow-xl overflow-hidden ${className}`}>
      <Image src={src} alt={alt} width={600} height={1299} priority={priority} sizes="(min-width: 768px) 240px, 46vw" className="w-full h-auto block rounded-[1.5rem]" />
    </div>
  );
}
