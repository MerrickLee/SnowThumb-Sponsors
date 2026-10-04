import type { Metadata } from "next";
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
import type { Campaign, Creative, Slot } from "@/lib/types";

export const metadata: Metadata = { title: "Campaign" };

export default async function CampaignPage({ params, searchParams }: PageProps<"/portal/campaigns/[id]">) {
  const { id } = await params;
  const justSubmitted = (await searchParams).submitted === "1";
  const session = await requireSponsor();
  const supabase = await createClient();
  const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle<Campaign>();
  if (!campaign) notFound();

  const [{ data: slots }, { data: creatives }] = await Promise.all([
    supabase.from("slots").select("*").eq("sellable", true).order("sort"),
    supabase.from("creatives").select("*").eq("campaign_id", id),
  ]);
  const crs = (creatives ?? []) as Creative[];
  const previews = await signedPreviews(supabase, crs);
  const editable = campaign.status === "draft" || campaign.status === "rejected";
  const hasLink = !!campaign.link_url;
  const hasArt = crs.length > 0;
  const ready = hasLink && hasArt;
  // Once locked, only show the placements that have art; empty upload boxes are just noise.
  const allSlots = (slots ?? []) as Slot[];
  const shownSlots = editable ? allSlots : allSlots.filter((sl) => crs.some((c) => c.slot_id === sl.id));

  const steps = [
    { t: "Details", done: hasLink, hint: hasLink ? "Link added" : "Add the link players visit" },
    { t: "Art", done: hasArt, hint: hasArt ? `${crs.length} placement${crs.length > 1 ? "s" : ""}` : "Upload at least one" },
    { t: "Review", done: !editable, hint: editable ? "Submit when ready" : campaign.status === "approved" ? "Approved" : "Submitted" },
  ];

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm mb-4"><Link className="link" href="/portal">Campaigns</Link> <span className="text-muted">/ {campaign.name}</span></nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="title text-3xl md:text-4xl">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-muted mt-2">{statusHelp(campaign.status)} · {campaignDates(campaign)}</p>
        </div>
      </div>

      <ol className="grid grid-cols-3 gap-2 md:gap-3 mb-8" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s.t} className={`rounded-lg border p-3 ${s.done ? "border-ok/30 bg-ok-soft" : "border-line bg-surface"}`} aria-current={!s.done && steps.slice(0, i).every((p) => p.done) ? "step" : undefined}>
            <p className="text-xs font-bold text-muted">STEP {i + 1}</p>
            <p className="font-bold flex items-center gap-1.5">{s.done && <span aria-hidden className="text-ok">✓</span>}{s.t}</p>
            <p className="text-xs text-muted mt-0.5 hidden sm:block">{s.hint}</p>
          </li>
        ))}
      </ol>

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
        <CampaignForm action={updateCampaign} campaign={campaign} disabled={!editable} />
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
