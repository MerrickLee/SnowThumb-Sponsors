"use client";

import { useState } from "react";
import Link from "next/link";
import { DAY_RATE_CENTS, BOARD_MONTH_CENTS, BINDING_MONTH_CENTS, BOOT_MONTH_CENTS, usd } from "@/lib/pricing";

export function SponsorPricingCalculator() {
  const [parkDays, setParkDays] = useState<number>(14);
  const [hasBoard, setHasBoard] = useState<boolean>(true);
  const [hasBindings, setHasBindings] = useState<boolean>(true);
  const [hasBoots, setHasBoots] = useState<boolean>(true);

  // Compute costs
  const parkCents = parkDays * DAY_RATE_CENTS;
  const boardCents = hasBoard ? BOARD_MONTH_CENTS : 0;
  const bindingCents = hasBindings ? BINDING_MONTH_CENTS : 0;
  const bootCents = hasBoots ? BOOT_MONTH_CENTS : 0;

  const totalCents = parkCents + boardCents + bindingCents + bootCents;
  const gearMonthlyCents = boardCents + bindingCents + bootCents;

  // Build target query string for the apply page
  const selectedGear: string[] = [];
  if (hasBoard) selectedGear.push("board");
  if (hasBindings) selectedGear.push("binding");
  if (hasBoots) selectedGear.push("boot");

  const applyUrl = `/apply?days=${parkDays}&gear=${selectedGear.join(",")}`;

  return (
    <div id="calculator" className="card border border-line shadow-2xl overflow-hidden bg-surface">
      <div className="bg-surface-2/70 p-6 md:p-8 border-b border-line">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-accent-soft text-accent mb-2">
          <span>Interactive Planner</span>
        </div>
        <h3 className="text-2xl md:text-3xl font-black text-text">Estimate Your Campaign Investment</h3>
        <p className="text-muted text-sm md:text-base mt-1">
          Pick your desired park takeover window and in-game gear slots to see real-time itemized pricing with zero hidden fees.
        </p>
      </div>

      <div className="p-6 md:p-8 grid lg:grid-cols-[1.3fr_1fr] gap-8">
        {/* Controls */}
        <div className="space-y-6">
          {/* Section 1: Park Duration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="park-days" className="font-bold text-text text-sm md:text-base">
                1. Exclusive Park Takeover Duration
              </label>
              <span className="font-bold text-sm text-accent num">
                {parkDays > 0 ? `${parkDays} days (${usd(parkCents)})` : "No park takeover"}
              </span>
            </div>
            <p className="text-xs text-muted mb-3">
              Full takeover of all indoor park wall banners, rail top wraps, kicker banners, and session titles at $50/day.
            </p>

            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { days: 0, label: "0 Days" },
                { days: 7, label: "7 Days" },
                { days: 14, label: "14 Days" },
                { days: 30, label: "30 Days" },
              ].map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => setParkDays(p.days)}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all text-center ${
                    parkDays === p.days
                      ? "border-accent bg-accent-soft text-text shadow-sm"
                      : "border-line bg-surface text-muted hover:text-text hover:border-line-strong"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                id="park-days"
                type="range"
                min="0"
                max="60"
                step="1"
                value={parkDays}
                onChange={(e) => setParkDays(parseInt(e.target.value, 10))}
                className="w-full accent-accent cursor-pointer"
              />
              <span className="text-xs font-bold text-muted num w-12 text-right">{parkDays}d</span>
            </div>
          </div>

          {/* Section 2: In-Game Gear Selection */}
          <div className="pt-6 border-t border-line">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-text text-sm md:text-base">
                2. In-Game Gear Room Placement (30-Day Listing)
              </span>
              <span className="font-bold text-sm text-ok num">
                {gearMonthlyCents > 0 ? `${usd(gearMonthlyCents)} / mo` : "No gear selected"}
              </span>
            </div>
            <p className="text-xs text-muted mb-4">
              Featured in the Gear Room shop. Riders unlock your gear with in-game Cred and keep riding it forever.
            </p>

            <div className="space-y-3">
              {/* Board */}
              <label className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                hasBoard ? "border-accent bg-accent-soft/30 shadow-sm" : "border-line bg-surface hover:bg-surface-2/40"
              }`}>
                <input
                  type="checkbox"
                  checked={hasBoard}
                  onChange={(e) => setHasBoard(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-accent rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-text">Sponsor Twin Snowboard</span>
                    <span className="font-bold text-sm text-text num">$500 / 30 days</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    First-person top-sheet graphic under riders&apos; feet on 100% of runs. Free challenge inclusion.
                  </p>
                </div>
              </label>

              {/* Bindings */}
              <label className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                hasBindings ? "border-accent bg-accent-soft/30 shadow-sm" : "border-line bg-surface hover:bg-surface-2/40"
              }`}>
                <input
                  type="checkbox"
                  checked={hasBindings}
                  onChange={(e) => setHasBindings(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-accent rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-text">Sponsor-Branded Bindings</span>
                    <span className="font-bold text-sm text-text num">$200 / 30 days</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Step-on or Strap styles with custom color scheme and highback logo decal.
                  </p>
                </div>
              </label>

              {/* Boots */}
              <label className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                hasBoots ? "border-accent bg-accent-soft/30 shadow-sm" : "border-line bg-surface hover:bg-surface-2/40"
              }`}>
                <input
                  type="checkbox"
                  checked={hasBoots}
                  onChange={(e) => setHasBoots(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-accent rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-text">Sponsor-Branded Snowboard Boots</span>
                    <span className="font-bold text-sm text-text num">$200 / 30 days</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Outer shaft logo decal with 4-part custom colorway (shell, trim, laces, sole).
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Invoice / Summary Card */}
        <div className="rounded-2xl border border-line bg-surface-2/60 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Summary Item</span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Rate</span>
            </div>

            <ul className="divide-y divide-line/60 text-sm py-2">
              <li className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-text">Park Takeover</span>
                  <div className="text-[11px] text-muted">{parkDays} days @ $50/day</div>
                </div>
                <span className="font-bold text-text num">{usd(parkCents)}</span>
              </li>

              {hasBoard && (
                <li className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-text">Snowboard</span>
                    <div className="text-[11px] text-muted">30-day Gear Room listing</div>
                  </div>
                  <span className="font-bold text-text num">{usd(BOARD_MONTH_CENTS)}</span>
                </li>
              )}

              {hasBindings && (
                <li className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-text">Bindings</span>
                    <div className="text-[11px] text-muted">30-day Gear Room listing</div>
                  </div>
                  <span className="font-bold text-text num">{usd(BINDING_MONTH_CENTS)}</span>
                </li>
              )}

              {hasBoots && (
                <li className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-text">Boots</span>
                    <div className="text-[11px] text-muted">30-day Gear Room listing</div>
                  </div>
                  <span className="font-bold text-text num">{usd(BOOT_MONTH_CENTS)}</span>
                </li>
              )}

              {totalCents === 0 && (
                <li className="py-4 text-center text-xs text-muted">
                  Select at least one placement or gear item above to calculate.
                </li>
              )}
            </ul>
          </div>

          <div className="pt-4 border-t border-line mt-4">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted block">Estimated Total</span>
                <span className="text-[11px] text-muted">Transparent pricing · No hidden setup fees</span>
              </div>
              <div className="text-3xl font-black text-text num">{usd(totalCents)}</div>
            </div>

            <Link
              href={applyUrl}
              className="btn btn-primary w-full shadow-md text-center justify-center font-bold"
            >
              Apply with This Package &rarr;
            </Link>

            <p className="text-[11px] text-muted text-center mt-3 leading-normal">
              We personally review every sponsor application within 24 hours. No payment is taken until your creative is approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
