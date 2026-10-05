import type { Metadata } from "next";
import { TrackOnMount } from "@/components/Track";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSponsor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { CampaignForm, SubmitButton } from "@/components/CampaignForm";
import { SlotUploader } from "@/components/SlotUploader";
import { DeleteDraft } from "@/components/DeleteDraft";
import { deleteDraft, submitCampaign, updateCampaign } from "@/app/portal/actions";
import { signedPreviews } from "@/lib/previews";
import { campaignDates } from "@/lib/format";
import { BookDays } from "@/components/BookDays";
import { BookGear } from "@/components/BookGear";
import { startCheckout } from "@/app/portal/billing-actions";
import { applyPaidSession, getStripe } from "@/lib/stripe";
import { GEAR_TERMS, isGearKind, usd } from "@/lib/pricing";
import type { Campaign, CampaignOrder, Creative, Slot } from "@/lib/types";

export const metadata: Metadata = { title: "Campaign" };

export default async function CampaignPage({ params, searchParams }: PageProps<"/portal/campaigns/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const justSubmitted = sp.submitted === "1";
  const justCreated = sp.created === "1";
  const session = await requireSponsor();
  const supabase = await createClient();

  // Back from Stripe: apply the payment now in case the webhook hasn't landed yet.
  const justPaid = sp.paid === "1";
  const canceledCheckout = sp.checkout === "canceled";
  if (justPaid && typeof sp.session_id === "string" && sp.session_id.startsWith("cs_")) {
    try {
      const cs = await getStripe().checkout.sessions.retrieve(sp.session_id);
      if (cs.metadata?.campaign_id === id) await applyPaidSession(cs, "return_page");
    } catch (e) { console.error("checkout sync", (e as Error).message); }
  }

  const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle<Campaign>();
  if (!campaign) notFound();

  const [{ data: slots }, { data: creatives }, { data: orderRows }, { data: challengeRows }, { data: totalsRow }] = await Promise.all([
    supabase.from("slots").select("*").eq("sellable", true).order("sort"),
    supabase.from("creatives").select("*").eq("campaign_id", id),
    supabase.from("campaign_orders").select("*").eq("campaign_id", id).in("status", ["paid", "refunded", "revoked"]).order("created_at", { ascending: false }),
    supabase.from("challenges").select("id, title, description, target_count, scope, prize_cred, reward_gear_id, starts_at, ends_at, active").eq("campaign_id", id).order("created_at"),
    supabase.from("campaign_stats_totals").select("challenge_starts, challenge_completes").eq("campaign_id", id).maybeSingle(),
  ]);
  const orders = (orderRows ?? []) as CampaignOrder[];
  const crs = (creatives ?? []) as Creative[];
  const previews = await signedPreviews(supabase, crs);
  const editable = campaign.status === "draft" || campaign.status === "rejected";
  const hasLink = !!campaign.link_url;
  const hasArt = crs.length > 0;
  const ready = hasLink && hasArt;

  // Payments: house brands and comped campaigns skip this entirely.
  const isHouse = session.sponsors.find((x) => x.id === campaign.sponsor_id)?.is_house ?? false;
  const needsPayment = !isHouse && campaign.requires_payment;
  const kindOf = Object.fromEntries(((slots ?? []) as Slot[]).map((sl) => [sl.id, sl.kind]));
  const approvedKinds = crs.filter((c) => c.status === "approved").map((c) => kindOf[c.slot_id] ?? "");
  const sellsPlacements = approvedKinds.some((k) => k && !isGearKind(k));
  const sellsGear = approvedKinds.some(isGearKind);
  const placementsOpen = !!campaign.paid_at && stillOpen(campaign.ends_at);
  const gearOpen = stillOpen(campaign.gear_ends_at);
  const lastDay = (iso: string | null) => iso ? new Date(new Date(iso).getTime() - 1).toLocaleDateString("en-CA", { timeZone: "America/New_York" }) : null;
  const booked = placementsOpen || gearOpen;
  const canBook = needsPayment && campaign.status === "approved";
  // Once locked, only show the placements that have art; empty upload boxes are just noise.
  const allSlots = (slots ?? []) as Slot[];
  const shownSlots = editable ? allSlots : allSlots.filter((sl) => crs.some((c) => c.slot_id === sl.id));

  const steps = [
    { t: "Details", done: hasLink, hint: hasLink ? "Link added" : "Add the link players visit" },
    { t: "Art", done: hasArt, hint: hasArt ? `${crs.length} placement${crs.length > 1 ? "s" : ""}` : "Upload at least one" },
    { t: "Review", done: !editable, hint: editable ? "Submit when ready" : campaign.status === "approved" ? "Approved" : "Submitted" },
    ...(needsPayment ? [{ t: "Book", done: booked, hint: booked ? "Paid" : "Pick dates and pay" }] : []),
  ];

  return (
    <>
      {justCreated && <TrackOnMount event="campaign_created" props={{ campaign_id: campaign.id }} />}
      {justSubmitted && <TrackOnMount event="campaign_submitted" props={{ campaign_id: campaign.id, placement_count: crs.length }} />}
      <nav aria-label="Breadcrumb" className="text-sm mb-4"><Link className="link" href="/portal">Campaigns</Link> <span className="text-muted">/ {campaign.name}</span></nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="title text-3xl md:text-4xl">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-muted mt-2">{needsPayment && campaign.status === "approved" && !booked
            ? "Approved. Book your dates to go live"
            : statusHelp(campaign.status)}{(!needsPayment || placementsOpen) && <> · {campaignDates(campaign)}</>}</p>
        </div>
      </div>

      <ol className={`grid ${steps.length === 4 ? "grid-cols-4" : "grid-cols-3"} gap-2 md:gap-3 mb-8`} aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s.t} className={`rounded-lg border p-3 ${s.done ? "border-ok/30 bg-ok-soft" : "border-line bg-surface"}`} aria-current={!s.done && steps.slice(0, i).every((p) => p.done) ? "step" : undefined}>
            <p className="text-xs font-bold text-muted">STEP {i + 1}</p>
            <p className="font-bold flex items-center gap-1.5">{s.done && <span aria-hidden className="text-ok">✓</span>}{s.t}</p>
            <p className="text-xs text-muted mt-0.5 hidden sm:block">{s.hint}</p>
          </li>
        ))}
      </ol>

      {justPaid && (
        <div className="notice notice-ok mb-6" role="status">
          <TrackOnMount event="campaign_purchased" props={{ campaign_id: campaign.id, currency: "USD", value: (orders[0]?.amount_cents ?? 0) / 100, transaction_id: orders[0]?.id ?? "" }} />
          <p className="font-bold">Payment received, you&apos;re booked</p>
          <p className="mt-1">Stripe emails your receipt. Players see your brand on their next app open once your dates start.</p>
        </div>
      )}
      {canceledCheckout && <div className="notice notice-info mb-6"><TrackOnMount event="checkout_canceled" props={{ campaign_id: campaign.id }} />Checkout canceled. Nothing was charged.</div>}
      {campaign.status === "rejected" && campaign.review_notes && (
        <div className="notice notice-warn mb-6" role="status">
          <p className="font-bold">Changes requested</p>
          <p className="mt-1">{campaign.review_notes}</p>
        </div>
      )}
      {campaign.status === "submitted" && (
        justSubmitted ? (
          <div className="notice notice-ok mb-6" role="status">
            <p className="font-bold">Submitted for review</p>
            <p className="mt-1">We check every file before it goes live. This page updates as soon as we approve it or send notes. Need a change in the meantime? Email sponsors@snowthumb.com.</p>
          </div>
        ) : (
          <div className="notice notice-info mb-6">This campaign is in review and locked for editing. Email sponsors@snowthumb.com if you need to change something.</div>
        )
      )}
      {campaign.status === "submitted" && session.isAdmin && (
        <div className="mb-6"><Link className="btn btn-primary" href="/admin/review">Review it now</Link></div>
      )}

      <section className="mb-10" aria-labelledby="details-h">
        <h2 id="details-h" className="title text-xl mb-3">1. Details</h2>
        <CampaignForm action={updateCampaign} campaign={campaign} disabled={!editable} showDates={!needsPayment} />
      </section>

      <section className="mb-10" aria-labelledby="art-h">
        <h2 id="art-h" className="title text-xl">2. Art</h2>
        <p className="text-muted mt-1 mb-4">
          {editable ? (
            <>Upload art only for the placements you&apos;re buying. Each file is checked for exact size before upload.{" "}
              <Link className="link" href="/portal/guide">Art guide and templates</Link></>
          ) : `${crs.length} placement${crs.length === 1 ? "" : "s"} in this campaign.`}
        </p>
        <SlotUploader sponsorId={campaign.sponsor_id} campaignId={campaign.id} slots={shownSlots}
          creatives={crs} previews={previews} editable={editable} />
      </section>


      {canBook && (
        <section className="mb-10" aria-labelledby="book-h">
          <h2 id="book-h" className="title text-xl">4. Book and pay</h2>
          <p className="text-muted mt-1 mb-4">Your art is approved. Pick your dates and pay to go live.</p>
          {!sellsPlacements && !sellsGear && <div className="notice notice-info">None of the art in this campaign is approved yet.</div>}
          <div className="grid gap-6">
            {sellsPlacements && (
              <div>
                <h3 className="font-bold mb-1">Park banners and features · $50 a day</h3>
                <p className="text-sm text-muted mb-3">
                  {placementsOpen ? `Booked through ${campaignDates({ starts_at: null, ends_at: campaign.ends_at }).replace(/^Now – /, "")}. Add days to keep going.` : "Your art on the course while players ride."}
                </p>
                <BookDays action={startCheckout} campaignId={campaign.id} extendFrom={placementsOpen ? lastDay(campaign.ends_at) : null} />
              </div>
            )}
            {sellsGear && (
              <div>
                <h3 className="font-bold mb-1">Your board in the gear shop · {usd(GEAR_TERMS.month.cents)} a month or {usd(GEAR_TERMS.year.cents)} a year</h3>
                <p className="text-sm text-muted mb-3">
                  {gearOpen ? `In the shop through ${campaignDates({ starts_at: null, ends_at: campaign.gear_ends_at }).replace(/^Now – /, "")}. Extend any time.` : "Players pick your board and ride it every run."}
                </p>
                <BookGear action={startCheckout} campaignId={campaign.id} extendFrom={gearOpen ? lastDay(campaign.gear_ends_at) : null} />
              </div>
            )}
          </div>
        </section>
      )}

      {(challengeRows ?? []).length > 0 && (
        <section className="mb-10" aria-labelledby="ch-h">
          <h2 id="ch-h" className="title text-xl mb-1">Your sponsored challenges</h2>
          <p className="text-muted mb-3 text-sm">Shown on the game&apos;s first screen while your campaign is live. Prizes are in-game only (Cred or your board).</p>
          <div className="card divide-y divide-line">
            {(challengeRows ?? []).map((ch) => (
              <div key={ch.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{ch.title}{!ch.active && <span className="text-xs text-muted"> · off</span>}</p>
                  <p className="text-sm text-muted">{ch.description ?? `${ch.target_count}× ${ch.scope === "run" ? "in one run" : "across runs"}`} · {campaignDates(ch)}</p>
                </div>
                <p className="text-sm">{[ch.prize_cred ? `${ch.prize_cred.toLocaleString()} Cred` : "", ch.reward_gear_id ? "your board" : ""].filter(Boolean).join(" + ") || "No prize"}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted mt-2">
            {(totalsRow?.challenge_starts ?? 0).toLocaleString()} players started · {(totalsRow?.challenge_completes ?? 0).toLocaleString()} finished (all your challenges, so far).
          </p>
        </section>
      )}

      {orders.length > 0 && (
        <section className="mb-10" aria-labelledby="pay-h">
          <h2 id="pay-h" className="title text-xl mb-3">Payments</h2>
          <div className="card divide-y divide-line">
            {orders.map((o) => (
              <div key={o.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{o.product === "gear" ? `Gear shop · ${o.term === "year" ? "1 year" : "1 month"}` : `Park placements · ${o.days} day${o.days === 1 ? "" : "s"}`}</p>
                  <p className="text-sm text-muted">{campaignDates({ starts_at: o.window_starts_at, ends_at: o.window_ends_at })}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{usd(o.paid_cents ?? o.amount_cents)}</p>
                  {o.promo_code && <p className="text-xs text-muted">Code {o.promo_code.toUpperCase()} · {usd(o.discount_cents)} off</p>}
                  <p className={`text-xs ${o.status === "refunded" || o.status === "revoked" ? "text-bad" : "text-muted"}`}>
                    {o.status === "refunded" ? "Refunded" : o.status === "revoked" ? "Code revoked. These days were removed." : `Paid ${new Date(o.paid_at ?? o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {editable && (
        <section aria-labelledby="review-h" className="sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-bg/95 backdrop-blur border-t border-line md:static md:mx-0 md:p-0 md:bg-transparent md:border-0">
          <h2 id="review-h" className="sr-only">3. Submit</h2>
          <div className="md:card md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="hidden md:block">
              <p className="font-bold">3. Submit for review</p>
              <p className="text-sm text-muted">{ready ? "After you submit, the campaign locks until we approve it or send notes." : !hasLink ? "Add the link players visit, then save details." : "Upload art for at least one placement."}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-between">
              {campaign.status === "draft" && <DeleteDraft action={deleteDraft} id={campaign.id} />}
              <SubmitButton action={submitCampaign} id={campaign.id} ready={ready} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/** True while a paid window hasn't ended. Server-rendered per request, so "now" is the request time. */
function stillOpen(iso: string | null) {
  return !!iso && new Date(iso).getTime() > Date.now();
}

function statusHelp(s: Campaign["status"]) {
  switch (s) {
    case "draft": return "Draft";
    case "submitted": return "In review";
    case "approved": return "Live or scheduled. Players get it on their next app open";
    case "rejected": return "Sent back with notes";
    case "paused": return "Paused, not showing in the app";
    case "archived": return "Archived";
  }
}
