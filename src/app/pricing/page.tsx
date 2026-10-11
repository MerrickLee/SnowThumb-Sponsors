import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Logo } from "@/components/Brand";
import { SponsorGearShowcase } from "@/components/SponsorGearShowcase";
import { SponsorPricingCalculator } from "@/components/SponsorPricingCalculator";
import { TrackOnView } from "@/components/Track";

export const metadata: Metadata = {
  title: "Sponsorship Opportunities & Pricing — SnowThumb",
  description: "Complete guide to sponsoring SnowThumb: park takeovers ($50/day), sponsor boards ($500/mo), bindings ($200/mo), and boots ($200/mo). Live interactive previews, art specs, and pricing calculator.",
};

export default function PricingPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-line bg-surface/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo height={22} href="/apply" />
            <nav className="hidden md:flex items-center gap-4 text-sm font-bold text-muted">
              <a href="#placements" className="hover:text-text transition-colors">Opportunities</a>
              <a href="#calculator" className="hover:text-text transition-colors">Pricing Planner</a>
              <a href="#matrix" className="hover:text-text transition-colors">Specs Matrix</a>
              <a href="#faq" className="hover:text-text transition-colors">FAQ</a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-sm btn-ghost">
              <span className="sm:hidden">Sign in</span>
              <span className="hidden sm:inline">Sponsor sign in</span>
            </Link>
            <Link href="/apply" className="btn btn-sm btn-primary">
              Apply to Sponsor
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 pt-10 md:pt-16 pb-12 text-center">
          <p className="eyebrow mx-auto max-w-max">Sponsorship Opportunities &amp; Pricing</p>
          <h1 className="display text-4xl sm:text-6xl md:text-7xl mt-4 max-w-4xl mx-auto">
            Put your brand under <span className="text-sky">riders&apos; feet</span> &amp; across the park.
          </h1>
          <p className="text-base sm:text-lg text-muted mt-5 max-w-2xl mx-auto leading-relaxed">
            SnowThumb is a fast-paced first-person snowboarding game on iOS and Android. 
            We replace irritating popup ads with authentic, native park signage and rider gear. 
            Here is everything you can sponsor, how it works, and our transparent pricing.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <a href="#calculator" className="btn btn-primary font-bold">
              Calculate Investment &rarr;
            </a>
            <a href="#showcase" className="btn font-bold">
              Explore Placements
            </a>
            <Link href="/apply" className="btn btn-ghost font-bold">
              Apply Now
            </Link>
          </div>

          {/* Quick Pillars */}
          <div className="grid sm:grid-cols-4 gap-3 mt-12 text-left max-w-5xl mx-auto">
            {[
              { t: "$50 / Day Park Takeover", d: "Own every rail wrap, wall blade, and kicker in the dome." },
              { t: "$200 / Mo Bindings & Boots", d: "Custom colors, your logo, and visible on every single run." },
              { t: "Permanent Retention", d: "Players who unlock your gear keep and ride it forever." },
              { t: "Hourly Live Analytics", d: "Real-time tracking of impressions, equips, and store clicks." },
            ].map((item) => (
              <div key={item.t} className="card p-4 border border-line bg-surface/80">
                <div className="text-xs font-bold uppercase tracking-wider text-accent num">Verified</div>
                <div className="font-bold text-text text-sm mt-1">{item.t}</div>
                <div className="text-xs text-muted mt-0.5 leading-normal">{item.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Showcase Section */}
        <section id="showcase" className="bg-surface-2/40 border-y border-line py-12 md:py-16 scroll-mt-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <p className="eyebrow">Interactive Previews</p>
              <h2 className="title text-3xl md:text-4xl mt-1">See Exactly What Players Ride</h2>
              <p className="text-muted text-sm md:text-base mt-2">
                Click through the tabs below to explore real in-game gear models, visual colorways, and placement specifications.
              </p>
            </div>

            <SponsorGearShowcase />
          </div>
        </section>

        {/* Itemized Placement Opportunities */}
        <section id="placements" className="mx-auto max-w-6xl px-4 py-12 md:py-16 scroll-mt-14">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="eyebrow">The Opportunities</p>
            <h2 className="title text-3xl md:text-4xl mt-1">Four Core Ways to Sponsor SnowThumb</h2>
            <p className="text-muted text-sm md:text-base mt-2">
              Book park takeovers by the day or gear placements by the 30-day month. Every placement is verified, exclusive, and live without app store delays.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Park Takeover */}
            <TrackOnView event="placement_viewed" props={{ slot_kind: "banner" }} className="card p-6 flex flex-col justify-between border-t-4 border-t-accent">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-accent bg-accent-soft px-2 py-0.5 rounded">
                  Exclusive Takeover
                </span>
                <h3 className="font-bold text-xl text-text mt-3">Indoor Park Takeover</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-text num">$50</span>
                  <span className="text-xs text-muted font-bold">/ day</span>
                </div>
                <p className="text-xs text-muted mt-2">
                  Presets: 7d ($350) · 14d ($700) · 30d ($1,500). Up to 90 days.
                </p>

                <ul className="mt-5 space-y-2.5 text-xs text-muted border-t border-line pt-4">
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Wall Banners:</strong> Overhead blades at drop-in &amp; course wall.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Feature Wraps:</strong> Rails, kickers &amp; box tops riders hit.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Session Title:</strong> &ldquo;Night session presented by [You]&rdquo;.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Exclusivity:</strong> Sole brand per player session; no rival ads.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-line">
                <Link href="/apply?type=park" className="btn btn-sm btn-ghost w-full justify-center font-bold">
                  Book Park Takeover &rarr;
                </Link>
              </div>
            </TrackOnView>

            {/* 2. Sponsored Snowboard */}
            <TrackOnView event="placement_viewed" props={{ slot_kind: "board" }} className="card p-6 flex flex-col justify-between border-t-4 border-t-sky">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-sky bg-accent-soft px-2 py-0.5 rounded">
                  Hero Equipment
                </span>
                <h3 className="font-bold text-xl text-text mt-3">Sponsor Twin Snowboard</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-text num">$500</span>
                  <span className="text-xs text-muted font-bold">/ 30 days</span>
                </div>
                <p className="text-xs text-muted mt-2">
                  Renewable each 30 days for continuous shop listing.
                </p>

                <ul className="mt-5 space-y-2.5 text-xs text-muted border-t border-line pt-4">
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>100% Screen Time:</strong> Riders look directly at deck every run.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Graphic Top Sheet:</strong> Exact 512×2048 PNG custom artwork.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Visit Sponsor Link:</strong> Tappable shop link to your store.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Permanent Unlocks:</strong> Riders keep board forever after campaign.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-line">
                <Link href="/apply?gear=board" className="btn btn-sm btn-ghost w-full justify-center font-bold">
                  Sponsor a Board &rarr;
                </Link>
              </div>
            </TrackOnView>

            {/* 3. Sponsored Bindings */}
            <TrackOnView event="placement_viewed" props={{ slot_kind: "binding" }} className="card p-6 flex flex-col justify-between border-t-4 border-t-ok">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-ok bg-ok-soft px-2 py-0.5 rounded">
                  New Gear Room
                </span>
                <h3 className="font-bold text-xl text-text mt-3">Sponsor Bindings</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-text num">$200</span>
                  <span className="text-xs text-muted font-bold">/ 30 days</span>
                </div>
                <p className="text-xs text-muted mt-2">
                  Count for another $200 every 30 days extended.
                </p>

                <ul className="mt-5 space-y-2.5 text-xs text-muted border-t border-line pt-4">
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Step-On or Strap:</strong> Choose binding mechanical style.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Custom Colors:</strong> Frame, strap, and hardware accents.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Logo Decal:</strong> 512×512 PNG on highback and ankle strap.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Shop Hero Card:</strong> Name, description, and direct Visit link.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-line">
                <Link href="/apply?gear=binding" className="btn btn-sm btn-ghost w-full justify-center font-bold">
                  Sponsor Bindings &rarr;
                </Link>
              </div>
            </TrackOnView>

            {/* 4. Sponsored Boots */}
            <TrackOnView event="placement_viewed" props={{ slot_kind: "boot" }} className="card p-6 flex flex-col justify-between border-t-4 border-t-ok">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-ok bg-ok-soft px-2 py-0.5 rounded">
                  New Gear Room
                </span>
                <h3 className="font-bold text-xl text-text mt-3">Sponsor Snowboard Boots</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-text num">$200</span>
                  <span className="text-xs text-muted font-bold">/ 30 days</span>
                </div>
                <p className="text-xs text-muted mt-2">
                  Count for another $200 every 30 days extended.
                </p>

                <ul className="mt-5 space-y-2.5 text-xs text-muted border-t border-line pt-4">
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>4-Zone Palette:</strong> Custom shell, trim, laces, and sole colors.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Shaft Decal:</strong> 512×512 PNG outer shaft placement.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Combo Bundle:</strong> Bindings + Boots for $400 / month.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ok font-bold">✓</span>
                    <span><strong>Permanent Locker:</strong> Unlocked boots remain in player inventory.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-line">
                <Link href="/apply?gear=boot" className="btn btn-sm btn-ghost w-full justify-center font-bold">
                  Sponsor Boots &rarr;
                </Link>
              </div>
            </TrackOnView>
          </div>
        </section>

        {/* Pricing Planner Calculator */}
        <section id="calculator" className="bg-surface-2/40 border-y border-line py-12 md:py-16 scroll-mt-14">
          <div className="mx-auto max-w-5xl px-4">
            <SponsorPricingCalculator />
          </div>
        </section>

        {/* Specs & Feature Comparison Matrix */}
        <section id="matrix" className="mx-auto max-w-6xl px-4 py-12 md:py-16 scroll-mt-14">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <p className="eyebrow">Comparison Matrix</p>
            <h2 className="title text-3xl md:text-4xl mt-1">Detailed Placement Specifications</h2>
            <p className="text-muted text-sm md:text-base mt-2">
              Everything you need to compare durations, art requirements, player unlock mechanics, and click-through links.
            </p>
          </div>

          <div className="card overflow-x-auto border border-line shadow-sm">
            <table className="table min-w-[700px]">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Sponsor Fee</th>
                  <th>Listing Term</th>
                  <th>Art Spec</th>
                  <th>Player Unlock</th>
                  <th>Visit Link</th>
                  <th>Player Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                <tr>
                  <td className="font-bold text-text">Park Wall Banners</td>
                  <td className="num font-bold text-accent">$50 / day</td>
                  <td>Daily (1–90 days)</td>
                  <td className="text-muted num">1024×256 &amp; 1024×512 PNG/JPG</td>
                  <td className="text-muted">Universal (all riders)</td>
                  <td className="text-ok font-bold">Post-run card</td>
                  <td className="text-muted">Campaign duration</td>
                </tr>
                <tr>
                  <td className="font-bold text-text">Feature Wraps &amp; Rails</td>
                  <td className="num font-bold text-accent">Included in Park</td>
                  <td>Daily (1–90 days)</td>
                  <td className="text-muted num">512×256 PNG/JPG</td>
                  <td className="text-muted">Universal (all riders)</td>
                  <td className="text-ok font-bold">Post-run card</td>
                  <td className="text-muted">Campaign duration</td>
                </tr>
                <tr>
                  <td className="font-bold text-text">Sponsor Snowboard</td>
                  <td className="num font-bold text-text">$500 / 30d</td>
                  <td>30 days (renewable)</td>
                  <td className="text-muted num">512×2048 PNG/JPG</td>
                  <td className="font-medium">35,000 Cred / Challenge</td>
                  <td className="text-ok font-bold">Shop hero button</td>
                  <td className="text-ok font-bold">Forever in locker</td>
                </tr>
                <tr>
                  <td className="font-bold text-text">Sponsor Bindings</td>
                  <td className="num font-bold text-ok">$200 / 30d</td>
                  <td>30 days (renewable)</td>
                  <td className="text-muted num">512×512 PNG + Hex colors</td>
                  <td className="font-medium">25,000 Cred</td>
                  <td className="text-ok font-bold">Shop hero button</td>
                  <td className="text-ok font-bold">Forever in locker</td>
                </tr>
                <tr>
                  <td className="font-bold text-text">Sponsor Boots</td>
                  <td className="num font-bold text-ok">$200 / 30d</td>
                  <td>30 days (renewable)</td>
                  <td className="text-muted num">512×512 PNG + Hex colors</td>
                  <td className="font-medium">25,000 Cred</td>
                  <td className="text-ok font-bold">Shop hero button</td>
                  <td className="text-ok font-bold">Forever in locker</td>
                </tr>
                <tr className="bg-surface-2/40">
                  <td className="font-bold text-text">Full Gear Rider Kit</td>
                  <td className="num font-black text-text">$900 / 30d</td>
                  <td>30 days (renewable)</td>
                  <td className="text-muted">Board + Logo + Colors</td>
                  <td className="font-medium">All 3 gear pieces</td>
                  <td className="text-ok font-bold">All 3 shop cards</td>
                  <td className="text-ok font-bold">Permanent fleet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-surface border-t border-line py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <p className="eyebrow">The Process</p>
              <h2 className="title text-3xl md:text-4xl mt-1">From Approval to In-Game in 24 Hours</h2>
              <p className="text-muted text-sm md:text-base mt-2">
                We engineered our platform so sponsors never have to wait on Apple or Google App Store review cycles.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  n: "01",
                  t: "Apply in 2 Minutes",
                  d: "Tell us about your brand and what gear or park placements you want. We review each application personally.",
                },
                {
                  n: "02",
                  t: "Upload & Customize",
                  d: "Log into the sponsor console. Pick your exact gear colors, upload transparent PNG logos, or drop in top sheet graphics.",
                },
                {
                  n: "03",
                  t: "Instant Mobile Sync",
                  d: "Once approved, our game server pushes your campaign directly to riders on their very next app launch.",
                },
                {
                  n: "04",
                  t: "Hourly Transparency",
                  d: "Track impressions, in-game view time, shop views, unlocks, and link clicks directly on your analytics dashboard.",
                },
              ].map((step) => (
                <div key={step.n} className="card p-5 border border-line bg-surface-2/30">
                  <div className="text-sky font-black text-2xl num">{step.n}</div>
                  <div className="font-bold text-lg text-text mt-2">{step.t}</div>
                  <div className="text-xs text-muted mt-1 leading-relaxed">{step.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section id="faq" className="mx-auto max-w-4xl px-4 py-12 md:py-16 scroll-mt-14">
          <div className="text-center mb-10">
            <p className="eyebrow">FAQ</p>
            <h2 className="title text-3xl md:text-4xl mt-1">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What happens after the 30-day listing ends for bindings or boots?",
                a: "If you don't renew for another $200 (or $500 for boards), the item leaves the Gear Room shop for new buyers. However, every single rider who bought or unlocked your gear keeps it in their locker forever and continues riding it in the game! You keep your virtual brand ambassadors indefinitely.",
              },
              {
                q: "Can players click through to our website or store?",
                a: "Yes! Every sponsored board, binding, and boot in the Gear Room has a dedicated 'VISIT <SPONSOR>' button with custom UTM tracking. Players can tap it before or after unlocking your gear. To maintain game immersion, links never interrupt a run—they only open from shop cards and post-run score screens.",
              },
              {
                q: "How does the binding and boot logo upload work?",
                a: "Bindings and boots share a single transparent 512×512 PNG logo file (max 256 KB). You choose the hex colors for each component (frame, straps, accent for bindings; shell, trim, laces, sole for boots) using our live visual customizer. Our engine handles the decals in 3D.",
              },
              {
                q: "Are the park takeover placements exclusive?",
                a: "Yes. During your active takeover, no competing brand shares the banners, feature tops, or session naming rights. If two sponsors book overlapping calendar dates, player sessions rotate exclusively every 3 runs (when the park terrain resets), ensuring 100% focused attention.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We process payments securely via Stripe (Credit Card, Apple Pay, Google Pay). You are only billed once your creative has been approved and you are ready to book your schedule.",
              },
            ].map((faq) => (
              <details key={faq.q} className="card p-5 border border-line group cursor-pointer">
                <summary className="font-bold text-base text-text flex items-center justify-between gap-4 list-none">
                  <span>{faq.q}</span>
                  <span className="text-muted font-black transition-transform group-open:rotate-180">↓</span>
                </summary>
                <p className="text-muted text-sm mt-3 leading-relaxed border-t border-line/60 pt-3">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-surface-2 border-t border-line py-12 md:py-16 text-center">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="title text-3xl md:text-5xl">Ready to Put Your Brand on the Snow?</h2>
            <p className="text-muted text-base mt-3 max-w-xl mx-auto">
              Tell us about your brand. We&apos;ll set up your sponsor console and help you get your artwork riding in SnowThumb.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <Link href="/apply" className="btn btn-primary text-base px-6 font-bold shadow-md">
                Apply to Sponsor Now &rarr;
              </Link>
              <a href="mailto:sponsors@snowthumb.com" className="btn text-base px-6 font-bold">
                Contact Us
              </a>
            </div>
            <p className="text-xs text-muted mt-4">
              Questions? Reach our team directly at <a href="mailto:sponsors@snowthumb.com" className="link">sponsors@snowthumb.com</a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
