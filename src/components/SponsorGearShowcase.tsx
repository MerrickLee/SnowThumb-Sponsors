"use client";

import { useState } from "react";
import Image from "next/image";
import { BindingSvg, BootSvg } from "@/components/GearCustomizer";

type Tab = "bindings" | "boots" | "board" | "park";

const BINDING_PRESETS = [
  { name: "Stealth Black", frame: "#181a1f", strap: "#282a36", accent: "#00d2ff", style: "strap" as const },
  { name: "Alpine White", frame: "#eef5fc", strap: "#cbd5e1", accent: "#0879d9", style: "strap" as const },
  { name: "Neon Volt", frame: "#1e293b", strap: "#0f172a", accent: "#10b981", style: "step_on" as const },
  { name: "Sunset Orange", frame: "#2d1522", strap: "#451a2d", accent: "#f97316", style: "step_on" as const },
];

const BOOT_PRESETS = [
  { name: "Midnight Navy", shell: "#0b192c", trim: "#1e3e62", laces: "#ffffff", sole: "#000000" },
  { name: "Glacier Grey", shell: "#e2e8f0", trim: "#475569", laces: "#0879d9", sole: "#1e293b" },
  { name: "Carbon & Gold", shell: "#171717", trim: "#262626", laces: "#fbbf24", sole: "#0a0a0a" },
  { name: "Earth Khaki", shell: "#3f3f46", trim: "#52525b", laces: "#e4d5b7", sole: "#27272a" },
];

export function SponsorGearShowcase() {
  const [activeTab, setActiveTab] = useState<Tab>("bindings");

  // Binding interactive preview state
  const [bStyle, setBStyle] = useState<"step_on" | "strap">("strap");
  const [bPreset, setBPreset] = useState(0);

  // Boot interactive preview state
  const [bootPreset, setBootPreset] = useState(0);

  return (
    <div className="card overflow-hidden border border-line shadow-xl bg-surface">
      {/* Navigation Tabs */}
      <div className="flex border-b border-line bg-surface-2/60 overflow-x-auto no-scrollbar" role="tablist" aria-label="Gear opportunities">
        {[
          { id: "bindings", label: "Bindings", price: "$200/mo", tag: "NEW" },
          { id: "boots", label: "Boots", price: "$200/mo", tag: "NEW" },
          { id: "board", label: "Snowboard", price: "$500/mo", tag: "HERO" },
          { id: "park", label: "Park Takeover", price: "$50/day", tag: "EXCLUSIVE" },
        ].map((t) => {
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => setActiveTab(t.id as Tab)}
              className={`flex-1 min-w-[140px] py-3.5 px-4 text-left transition-all relative border-r border-line last:border-r-0 ${
                isSelected
                  ? "bg-surface text-text font-bold shadow-sm"
                  : "text-muted hover:text-text hover:bg-surface/50"
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">{t.label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  t.tag === "NEW" ? "bg-ok-soft text-ok" : t.tag === "HERO" ? "bg-accent-soft text-accent" : "bg-surface-2 text-text"
                }`}>
                  {t.tag}
                </span>
              </div>
              <div className="text-base font-black text-text mt-0.5 num">{t.price}</div>
              {isSelected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="p-6 md:p-8">
        {/* Panel 1: Bindings */}
        {activeTab === "bindings" && (
          <div id="panel-bindings" role="tabpanel" aria-labelledby="tab-bindings" className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-ok-soft text-ok mb-3">
                <span>In-Game Gear Room Placement</span>
                <span>•</span>
                <span className="num">$200 per 30 days</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-text">Sponsor-Branded Bindings</h3>
              <p className="text-muted text-sm md:text-base mt-2 leading-relaxed">
                Riders look down at their stance throughout every single run. You customize the chassis and strap colors, 
                pick Step-On or Strap style, and upload your transparent logo. Our game puts your logo on the highback and ankle straps.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mt-6 text-sm">
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Player Unlock</div>
                  <div className="text-muted mt-0.5">25,000 Cred (or free for Pro). Earned by landing tricks.</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Visit Sponsor Link</div>
                  <div className="text-muted mt-0.5">One-tap tracked visit button in the shop card before and after unlocking.</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Art Spec</div>
                  <div className="text-muted mt-0.5">Transparent 512×512 PNG logo (&le; 256 KB). Shared with boots if desired.</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Permanent Retention</div>
                  <div className="text-muted mt-0.5">Players who unlock your bindings keep them forever in their locker!</div>
                </div>
              </div>

              {/* Interactive style & preset toggles */}
              <div className="mt-6 pt-6 border-t border-line">
                <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">Try interactive styles & palettes:</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="inline-flex rounded-lg border border-line p-1 bg-surface-2">
                    <button
                      type="button"
                      onClick={() => setBStyle("strap")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        bStyle === "strap" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
                      }`}
                    >
                      Strap In
                    </button>
                    <button
                      type="button"
                      onClick={() => setBStyle("step_on")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        bStyle === "step_on" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
                      }`}
                    >
                      Step-On
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BINDING_PRESETS.map((p, idx) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => { setBPreset(idx); setBStyle(p.style); }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                          bPreset === idx ? "border-accent bg-accent-soft text-text font-bold" : "border-line text-muted hover:text-text"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Visual Preview */}
            <div className="rounded-2xl border border-line bg-gradient-to-b from-surface-2 to-surface p-6 flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted mb-2">Live Side-View Render</span>
              <div className="w-full max-w-[260px] py-4">
                <BindingSvg
                  style={bStyle}
                  frame={BINDING_PRESETS[bPreset].frame}
                  strap={BINDING_PRESETS[bPreset].strap}
                  accent={BINDING_PRESETS[bPreset].accent}
                  logoUrl="/brand/snowthumb-logo.png"
                />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-line text-xs font-medium text-muted mt-3">
                <span className="w-2 h-2 rounded-full bg-ok" />
                <span>Logo decal composited on highback & ankle strap</span>
              </div>
            </div>
          </div>
        )}

        {/* Panel 2: Boots */}
        {activeTab === "boots" && (
          <div id="panel-boots" role="tabpanel" aria-labelledby="tab-boots" className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-ok-soft text-ok mb-3">
                <span>In-Game Gear Room Placement</span>
                <span>•</span>
                <span className="num">$200 per 30 days</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-text">Sponsor-Branded Snowboard Boots</h3>
              <p className="text-muted text-sm md:text-base mt-2 leading-relaxed">
                Boots sit directly above the snowboard deck and are in plain view on every carve, jump tweak, and rail balance.
                Configure Shell, Trim, Laces, and Sole colors, then upload your 512×512 logo. Our Unity engine places your decal
                on the outer boot shaft.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mt-6 text-sm">
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Player Unlock</div>
                  <div className="text-muted mt-0.5">25,000 Cred (or free for Pro). Equippable immediately.</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Gear Room Hero Card</div>
                  <div className="text-muted mt-0.5">Includes your brand name, description, and Visit link.</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Art Spec</div>
                  <div className="text-muted mt-0.5">Transparent 512×512 PNG logo (&le; 256 KB).</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Bundle Savings</div>
                  <div className="text-muted mt-0.5">Pair Bindings + Boots for $400/month for a complete foot setup.</div>
                </div>
              </div>

              {/* Interactive color presets */}
              <div className="mt-6 pt-6 border-t border-line">
                <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">Try boot color combinations:</p>
                <div className="flex flex-wrap gap-2">
                  {BOOT_PRESETS.map((p, idx) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setBootPreset(idx)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                        bootPreset === idx ? "border-accent bg-accent-soft text-text font-bold" : "border-line text-muted hover:text-text"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Visual Preview */}
            <div className="rounded-2xl border border-line bg-gradient-to-b from-surface-2 to-surface p-6 flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted mb-2">Live 3D Boot Profile</span>
              <div className="w-full max-w-[260px] py-4">
                <BootSvg
                  shell={BOOT_PRESETS[bootPreset].shell}
                  trim={BOOT_PRESETS[bootPreset].trim}
                  laces={BOOT_PRESETS[bootPreset].laces}
                  sole={BOOT_PRESETS[bootPreset].sole}
                  logoUrl="/brand/snowthumb-logo.png"
                />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-line text-xs font-medium text-muted mt-3">
                <span className="w-2 h-2 rounded-full bg-ok" />
                <span>Outer shaft decal mirrored on left & right boots</span>
              </div>
            </div>
          </div>
        )}

        {/* Panel 3: Snowboard */}
        {activeTab === "board" && (
          <div id="panel-board" role="tabpanel" aria-labelledby="tab-board" className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-accent-soft text-accent mb-3">
                <span>The Flagship Hero Placement</span>
                <span>•</span>
                <span className="num">$500 per 30 days</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-text">Sponsor-Branded Twin Snowboard</h3>
              <p className="text-muted text-sm md:text-base mt-2 leading-relaxed">
                Because SnowThumb is a first-person mobile snowboarding game, riders look down directly at the top sheet of the board
                during every second of gameplay. Your custom board graphic is front and center on every drop-in, carve, 360 spin, and landing.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mt-6 text-sm">
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Player Unlock</div>
                  <div className="text-muted mt-0.5">35,000 Cred (or unlocked via your custom trick challenge).</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">First-Person Screen Time</div>
                  <div className="text-muted mt-0.5">100% in-game view time during every run ridden on your deck.</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Art Spec</div>
                  <div className="text-muted mt-0.5">Exact 512×2048 PNG or JPEG top sheet with downloadable template.</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Permanent Ambassadors</div>
                  <div className="text-muted mt-0.5">Players who unlock your board keep riding it permanently!</div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-line flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-text">Pair with a Sponsor Challenge</div>
                  <div className="text-xs text-muted">Reward riders who land your signature trick with your board.</div>
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-ok bg-ok-soft px-2.5 py-1 rounded-md">Included Free</span>
              </div>
            </div>

            {/* Visual Board Mockup */}
            <div className="rounded-2xl border border-line bg-gradient-to-b from-surface-2 to-surface p-6 flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted mb-2">In-Game First Person View</span>
              <div className="relative w-full max-w-[240px] rounded-2xl overflow-hidden shadow-2xl border-4 border-text">
                <Image
                  src="/brand/gameplay-board.jpg"
                  alt="In-game snowboard first person view"
                  width={600}
                  height={1299}
                  className="w-full h-auto block"
                />
              </div>
              <figcaption className="text-xs text-muted mt-3">What the rider sees underfoot at all times</figcaption>
            </div>
          </div>
        )}

        {/* Panel 4: Park Takeover */}
        {activeTab === "park" && (
          <div id="panel-park" role="tabpanel" aria-labelledby="tab-park" className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-surface-2 text-text mb-3">
                <span>Exclusive Park Takeover</span>
                <span>•</span>
                <span className="num">$50 / day ($350/wk · $1,500/mo)</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-text">Indoor Park Banners & Feature Wraps</h3>
              <p className="text-muted text-sm md:text-base mt-2 leading-relaxed">
                Take over the indoor snow dome. Your brand completely owns every wall blade from drop-in to the finish wall,
                every rail feature top, box top, and kicker riders aim for. While active, no other sponsor shares your space.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mt-6 text-sm">
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Full Park Exclusivity</div>
                  <div className="text-muted mt-0.5">Single-brand takeover. Guaranteed sole presence per player session.</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Zero Wait Time</div>
                  <div className="text-muted mt-0.5">Approved art goes live immediately across all mobile clients.</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Included Placements</div>
                  <div className="text-muted mt-0.5">Hall Wall Banners, Feature Wraps, and Night Session Title cards.</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                  <div className="font-bold text-text">Hourly Metrics</div>
                  <div className="text-muted mt-0.5">Live reporting for impressions, view duration, and unique riders.</div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-line">
                <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Flexible Duration Presets:</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-lg border border-line bg-surface font-bold text-text">7 Days: $350</span>
                  <span className="px-3 py-1.5 rounded-lg border border-line bg-surface font-bold text-text">14 Days: $700</span>
                  <span className="px-3 py-1.5 rounded-lg border border-line bg-surface font-bold text-text">30 Days: $1,500</span>
                  <span className="px-3 py-1.5 rounded-lg border border-line bg-surface text-muted">Custom: $50 / day up to 90 days</span>
                </div>
              </div>
            </div>

            {/* Park Mockup */}
            <div className="rounded-2xl border border-line bg-gradient-to-b from-surface-2 to-surface p-6 flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted mb-2">Park Architecture & Placements</span>
              <div className="relative w-full max-w-[280px] rounded-xl overflow-hidden shadow-lg border border-line">
                <Image
                  src="/brand/board-room.jpg"
                  alt="Park venue and banner architecture"
                  width={600}
                  height={1299}
                  className="w-full h-auto block"
                />
              </div>
              <figcaption className="text-xs text-muted mt-3">High-visibility wall blades & course signage</figcaption>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
