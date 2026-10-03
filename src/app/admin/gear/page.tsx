import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/Shell";
import { ActionForm } from "@/components/ActionForm";
import { saveChallenge, saveGear, toggleChallenge, toggleGear } from "@/app/admin/actions";
import { campaignDates } from "@/lib/format";

const TRICKS: [string, string][] = [
  ["any", "Any trick"], ["50_50", "50-50"], ["boardslide", "Boardslide"], ["lipslide", "Lipslide"],
  ["nose_press", "Nose press"], ["tail_press", "Tail press"],
  ["spin_out_180", "180 out"], ["spin_out_360", "360 out"], ["spin_out_540", "540 out"],
  ["feature_spin_180", "180 feature spin"], ["feature_spin_360", "360 feature spin"],
  ["tabletop_straight", "Straight air (tabletop)"], ["tabletop_180", "Tabletop 180"], ["tabletop_360", "Tabletop 360"], ["tabletop_540", "Tabletop 540"],
];

export default async function GearAdmin() {
  const supabase = await createClient();
  const [{ data: gear }, { data: challenges }, { data: slots }, { data: creatives }, { data: sponsors }] = await Promise.all([
    supabase.from("gear_items").select("*, sponsors(name)").order("sort"),
    supabase.from("challenges").select("*, sponsors(name)").order("created_at", { ascending: false }),
    supabase.from("slots").select("id, label, base_model_id, kind").in("kind", ["board", "binding"]).order("sort"),
    supabase.from("creatives").select("id, slot_id, campaigns(name), sponsors(name)").eq("status", "approved").in("slot_id",
      ["board_twin_v1", "board_directional_v1", "binding_classic_v1"]),
    supabase.from("sponsors").select("id, name").order("name"),
  ]);

  return (
    <>
      <PageHeader title="Gear & challenges" sub="Boards and bindings players unlock, and the sponsor challenges that award them. Changes reach the app on the next manifest fetch." />

      <section className="mb-10">
        <h2 className="font-semibold mb-3">Add or update gear</h2>
        <ActionForm action={saveGear} submit="Save gear" className="card p-5 grid md:grid-cols-4 gap-4">
          <div><label className="label">Gear ID</label><input name="id" className="input" required placeholder="board_acme_fall26" pattern="[a-z0-9_]{3,64}" />
            <p className="text-xs text-muted mt-1">Permanent. Stored in player saves. Same ID updates.</p></div>
          <div><label className="label">Kind</label><select name="kind" className="select"><option value="board">Board</option><option value="binding">Binding</option></select></div>
          <div><label className="label">Base model</label><select name="base_model_id" className="select">
            {(slots ?? []).map((s) => <option key={s.id} value={s.base_model_id ?? s.id}>{s.label} ({s.base_model_id})</option>)}
          </select></div>
          <div><label className="label">Display name</label><input name="name" className="input" required placeholder="Acme Fall Twin" /></div>
          <div className="md:col-span-2"><label className="label">Sponsor art (approved creative)</label><select name="creative_id" className="select">
            <option value="">None: use the board&apos;s built-in art</option>
            {(creatives ?? []).map((c) => {
              const camp = (c.campaigns as unknown as { name: string } | null)?.name;
              const sp = (c.sponsors as unknown as { name: string } | null)?.name;
              return <option key={c.id} value={c.id}>{sp} · {camp} · {c.slot_id}</option>;
            })}
          </select><p className="text-xs text-muted mt-1">Picking art also ties the gear to that sponsor&apos;s campaign dates.</p></div>
          <div><label className="label">Sponsor (if no art)</label><select name="sponsor_id" className="select">
            <option value="">House / none</option>{(sponsors ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
          <div><label className="label">Tagline</label><input name="tagline" className="input" placeholder="Built for rails" /></div>
          <div><label className="label">Unlock by</label><select name="unlock" className="select">
            <option value="cred">Cred price</option><option value="score">Score threshold</option>
            <option value="challenge">Challenge only</option><option value="free">Free</option><option value="iap">In-app purchase</option>
          </select></div>
          <div><label className="label">Cred price</label><input name="cred_price" type="number" min={0} className="input" placeholder="500" /></div>
          <div><label className="label">Score threshold</label><input name="score_threshold" type="number" min={0} className="input" /></div>
          <div><label className="label">IAP product ID</label><input name="iap_product_id" className="input" placeholder="com.snowthumb.board.x" /></div>
          <div><label className="label">Sort</label><input name="sort" type="number" className="input" defaultValue={0} /></div>
          <label className="flex items-center gap-2 text-sm md:col-span-3"><input type="checkbox" name="keep_after_end" defaultChecked />
            Players who unlocked it keep it after the campaign ends</label>
        </ActionForm>

        <div className="card overflow-x-auto mt-4">
          <table className="table">
            <thead><tr><th>ID</th><th>Name</th><th>Sponsor</th><th>Unlock</th><th>Art</th><th></th></tr></thead>
            <tbody>
              {(gear ?? []).map((g) => (
                <tr key={g.id} className={g.active ? "" : "opacity-50"}>
                  <td className="font-mono text-xs">{g.id}</td>
                  <td>{g.name}<span className="text-muted text-xs block">{g.kind} · {g.base_model_id}</span></td>
                  <td className="text-muted">{(g.sponsors as { name: string } | null)?.name ?? "House"}</td>
                  <td className="num">{g.unlock === "cred" ? `${g.cred_price} Cred` : g.unlock === "score" ? `Score ${g.score_threshold}` : g.unlock}</td>
                  <td className="text-muted text-xs">{g.creative_id ? "Sponsor art" : "Built-in"}</td>
                  <td><form action={toggleGear}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="active" value={String(!g.active)} />
                    <button className="btn btn-sm">{g.active ? "Disable" : "Enable"}</button></form></td>
                </tr>
              ))}
              {(gear ?? []).length === 0 && <tr><td colSpan={6} className="text-muted">No gear yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Add a challenge</h2>
        <ActionForm action={saveChallenge} submit="Add challenge" className="card p-5 grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2"><label className="label">Title</label><input name="title" className="input" required placeholder="Acme Rail Jam" /></div>
          <div className="md:col-span-2"><label className="label">Description</label><input name="description" className="input" placeholder="Land 5 boardslides on rails in one run" /></div>
          <div><label className="label">Scope</label><select name="scope" className="select"><option value="run">In one run</option><option value="total">Across all runs</option></select></div>
          <div><label className="label">Feature</label><select name="feature" className="select">
            {["any", "box", "tube", "rail", "jump"].map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
          <div><label className="label" htmlFor="trick">Trick</label><select id="trick" name="trick" className="select" defaultValue="any">
            {TRICKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
          <div><label className="label">Target count</label><input name="target_count" type="number" min={1} className="input" defaultValue={1} /></div>
          <div><label className="label">Min run points</label><input name="min_points" type="number" min={0} className="input" defaultValue={0} /></div>
          <div><label className="label">Reward gear</label><select name="reward_gear_id" className="select">
            <option value="">None</option>{(gear ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
          <div><label className="label">Sponsor (if no reward)</label><select name="sponsor_id" className="select">
            <option value="">House / none</option>{(sponsors ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="label">Start</label><input name="starts_at" type="date" className="input" /></div>
          <div><label className="label">End</label><input name="ends_at" type="date" className="input" /></div>
        </ActionForm>

        <div className="card overflow-x-auto mt-4">
          <table className="table">
            <thead><tr><th>Challenge</th><th>Rule</th><th>Reward</th><th>Dates</th><th></th></tr></thead>
            <tbody>
              {(challenges ?? []).map((c) => (
                <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                  <td>{c.title}<span className="text-muted text-xs block">{(c.sponsors as { name: string } | null)?.name ?? "House"}</span></td>
                  <td className="text-sm">{c.target_count}× {c.trick} on {c.feature} ({c.scope === "run" ? "one run" : "total"}){c.min_points ? `, ≥${c.min_points} pts` : ""}</td>
                  <td className="font-mono text-xs">{c.reward_gear_id ?? "None"}</td>
                  <td className="text-muted text-sm">{campaignDates(c)}</td>
                  <td><form action={toggleChallenge}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={String(!c.active)} />
                    <button className="btn btn-sm">{c.active ? "Disable" : "Enable"}</button></form></td>
                </tr>
              ))}
              {(challenges ?? []).length === 0 && <tr><td colSpan={5} className="text-muted">No challenges yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
