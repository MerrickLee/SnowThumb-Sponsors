import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { SlotMockup } from "@/components/SlotMockup";
import { CampaignReview, CreativeReview } from "@/components/ReviewActions";
import { signedPreviews } from "@/lib/previews";
import { campaignDates } from "@/lib/format";
import type { Campaign, Creative, Slot } from "@/lib/types";

export default async function ReviewQueue() {
  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from("campaigns").select("*, sponsors(name, is_house)").eq("status", "submitted").order("submitted_at");
  const list = (campaigns ?? []) as (Campaign & { sponsors: { name: string; is_house: boolean } })[];

  const ids = list.map((c) => c.id);
  const [{ data: creatives }, { data: slots }] = await Promise.all([
    ids.length ? supabase.from("creatives").select("*").in("campaign_id", ids) : Promise.resolve({ data: [] }),
    supabase.from("slots").select("*"),
  ]);
  const crs = (creatives ?? []) as Creative[];
  const previews = await signedPreviews(supabase, crs);
  const slotById = Object.fromEntries(((slots ?? []) as Slot[]).map((s) => [s.id, s]));

  return (
    <>
      <PageHeader title="Review" sub="Approving validates every file against its slot, publishes it, and the app picks it up on the next open." />
      {list.length === 0 ? (
        <Empty>Nothing waiting for review.</Empty>
      ) : (
        <div className="space-y-6">
          {list.map((c) => (
            <section key={c.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide">{c.sponsors.name}{c.sponsors.is_house ? " · house" : ""}</p>
                  <h2 className="text-lg font-semibold">{c.name}</h2>
                  <p className="text-sm text-muted mt-1">
                    {campaignDates(c)} · Priority {c.priority} · Link{" "}
                    {c.link_url ? <a className="link" href={c.link_url} target="_blank" rel="noreferrer">{c.link_url}</a> : <span className="text-bad">missing</span>}
                  </p>
                  {c.notes && <p className="text-sm mt-2 whitespace-pre-wrap">Sponsor notes: {c.notes}</p>}
                </div>
                <StatusBadge status={c.status} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {crs.filter((cr) => cr.campaign_id === c.id).map((cr) => {
                  const slot = slotById[cr.slot_id];
                  return (
                    <div key={cr.id} className="rounded-lg border border-line p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{slot?.label ?? cr.slot_id}</p>
                        <StatusBadge status={cr.status} />
                      </div>
                      {slot && <SlotMockup slot={slot} src={previews[cr.id]} />}
                      <p className="text-xs text-muted num">Required {slot?.width}×{slot?.height}px. Checked on approve.</p>
                      <CreativeReview creativeId={cr.id} status={cr.status} />
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-line mt-5 pt-5">
                <CampaignReview campaignId={c.id} />
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
