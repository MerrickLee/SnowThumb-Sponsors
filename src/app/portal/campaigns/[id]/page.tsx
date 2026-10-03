import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSponsor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { CampaignForm, SubmitButton } from "@/components/CampaignForm";
import { SlotUploader } from "@/components/SlotUploader";
import { deleteDraft, submitCampaign, updateCampaign } from "@/app/portal/actions";
import { signedPreviews } from "@/lib/previews";
import type { Campaign, Creative, Slot } from "@/lib/types";

export default async function CampaignPage({ params }: PageProps<"/portal/campaigns/[id]">) {
  const { id } = await params;
  await requireSponsor();
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

  return (
    <>
      <p className="text-sm mb-2"><Link className="link" href="/portal">← Campaigns</Link></p>
      <PageHeader
        title={campaign.name}
        sub={statusHelp(campaign.status)}
        action={<StatusBadge status={campaign.status} />}
      />

      {campaign.status === "rejected" && campaign.review_notes && (
        <div className="card p-4 mb-6 border-warn/50">
          <p className="text-sm font-semibold text-warn">Changes requested</p>
          <p className="text-sm mt-1">{campaign.review_notes}</p>
        </div>
      )}

      <section className="mb-8">
        <h2 className="font-semibold mb-3">Details</h2>
        <CampaignForm action={updateCampaign} campaign={campaign} disabled={!editable} />
      </section>

      <section className="mb-8">
        <h2 className="font-semibold mb-1">Placements</h2>
        <p className="text-sm text-muted mb-3">Upload art only for the placements you&apos;re buying. Files are checked for exact size before upload.</p>
        <SlotUploader sponsorId={campaign.sponsor_id} campaignId={campaign.id} slots={(slots ?? []) as Slot[]}
          creatives={crs} previews={previews} editable={editable} />
      </section>

      {editable && (
        <section className="card p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Ready?</h2>
            <p className="text-sm text-muted">After you submit, the campaign locks until we approve it or send it back.</p>
          </div>
          <div className="flex items-center gap-3">
            {campaign.status === "draft" && (
              <form action={deleteDraft}><input type="hidden" name="id" value={campaign.id} />
                <button className="btn btn-danger">Delete draft</button></form>
            )}
            <SubmitButton action={submitCampaign} id={campaign.id} />
          </div>
        </section>
      )}
    </>
  );
}

function statusHelp(s: Campaign["status"]) {
  switch (s) {
    case "draft": return "Draft. Add your art, then submit for review.";
    case "submitted": return "In review. We'll approve it or send notes back.";
    case "approved": return "Live (or scheduled). Players get it on their next app open.";
    case "rejected": return "We sent this back with notes. Make changes and resubmit.";
    case "paused": return "Paused. Not showing in the app right now.";
    case "archived": return "Archived.";
  }
}
