import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionForm } from "@/components/ActionForm";
import { createHouseCampaign } from "@/app/admin/actions";
import type { Campaign, Sponsor } from "@/lib/types";

export default async function HouseAds() {
  const supabase = await createClient();
  const { data: sponsors } = await supabase.from("sponsors").select("*").eq("is_house", true).order("name");
  const house = (sponsors ?? []) as Sponsor[];
  const { data: campaigns } = house.length
    ? await supabase.from("campaigns").select("*").in("sponsor_id", house.map((s) => s.id)).order("created_at", { ascending: false })
    : { data: [] };

  return (
    <>
      <PageHeader title="House ads" sub="Your own brands fill every slot nobody has paid for. They run at priority 0, so any paid campaign beats them." />
      <div className="card p-4 mb-6 text-sm border-warn/40">
        <p className="font-semibold text-warn">Love Capital Partners</p>
        <p className="mt-1 text-muted">Keep it to logo and name only: no investment language, returns or deal links. Get securities counsel&apos;s OK before it goes live.</p>
      </div>
      <ActionForm action={createHouseCampaign} submit="Create and add art" className="card p-5 grid md:grid-cols-3 gap-4 mb-8">
        <div>
          <label className="label">Brand</label>
          <select name="sponsor_id" className="select">{house.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </div>
        <div><label className="label">Campaign name</label><input name="name" className="input" required placeholder="House: Croes Ave fall" /></div>
        <div><label className="label">Link</label><input name="link_url" className="input" placeholder="https://croesave.com" /></div>
      </ActionForm>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Campaign</th><th>Brand</th><th>Status</th></tr></thead>
          <tbody>
            {((campaigns ?? []) as Campaign[]).map((c) => (
              <tr key={c.id}>
                <td><Link className="link" href={`/portal/campaigns/${c.id}`}>{c.name}</Link></td>
                <td className="text-muted">{house.find((h) => h.id === c.sponsor_id)?.name}</td>
                <td><StatusBadge status={c.status} /></td>
              </tr>
            ))}
            {(campaigns ?? []).length === 0 && <tr><td colSpan={3} className="text-muted">No house campaigns yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted mt-4">Flow: create here → upload art on the campaign page → submit → approve it in Review.</p>
    </>
  );
}
