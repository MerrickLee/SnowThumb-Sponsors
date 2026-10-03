/* eslint-disable @next/next/no-img-element */
import { createClient } from "@/lib/supabase/server";
import { Empty, PageHeader } from "@/components/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionForm } from "@/components/ActionForm";
import { acceptApplication, setApplicationStatus } from "@/app/admin/actions";
import { SLOT_KIND_LABEL, type SlotKind } from "@/lib/types";

export default async function Applications({ searchParams }: PageProps<"/admin/applications">) {
  const sp = await searchParams;
  const show = sp.show === "all" ? "all" : "open";
  const supabase = await createClient();
  let q = supabase.from("sponsor_applications").select("*").order("created_at", { ascending: false }).limit(200);
  if (show === "open") q = q.in("status", ["new", "contacted"]);
  const { data: apps } = await q;

  const logoPaths = (apps ?? []).map((a) => a.logo_path).filter(Boolean) as string[];
  const { data: signed } = logoPaths.length
    ? await supabase.storage.from("sponsor-intake").createSignedUrls(logoPaths, 3600)
    : { data: [] };
  const logoUrl = Object.fromEntries((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));

  return (
    <>
      <PageHeader
        title="Applications"
        sub="From the sponsor form on snowthumb.com. Accepting creates the sponsor and emails them a sign-in invite."
        action={
          <div className="flex gap-2 text-sm">
            <a className={`btn btn-sm ${show === "open" ? "btn-primary" : ""}`} href="?show=open" aria-current={show === "open" ? "page" : undefined}>Open</a>
            <a className={`btn btn-sm ${show === "all" ? "btn-primary" : ""}`} href="?show=all" aria-current={show === "all" ? "page" : undefined}>All</a>
          </div>
        }
      />
      {(apps ?? []).length === 0 ? (
        <Empty title={show === "open" ? "No open applications" : "No applications yet"}
          action={<a className="btn" href="/apply" target="_blank" rel="noreferrer">View the sponsor page</a>}>
          New applications from the sponsor page land here. Share sponsors.snowthumb.com/apply with brands you&apos;re talking to.
        </Empty>
      ) : (
        <div className="space-y-4">
          {apps!.map((a) => {
            const logo = a.logo_path ? logoUrl[a.logo_path] : null;
            const isPdf = a.logo_path?.endsWith(".pdf");
            return (
              <div key={a.id} className="card p-5 grid md:grid-cols-[120px_1fr_auto] gap-5">
                <div className="h-24 w-28 rounded-md bg-bg border border-line grid place-items-center overflow-hidden">
                  {logo && !isPdf ? <img src={logo} alt={`${a.company_name} logo`} className="max-h-full max-w-full object-contain" />
                    : logo ? <a className="link text-sm" href={logo} target="_blank" rel="noreferrer">Logo PDF</a>
                    : <span className="text-xs text-muted">No logo</span>}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-lg">{a.company_name}</h2>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm mt-1">
                    {a.contact_name} · <a className="link" href={`mailto:${a.contact_email}`}>{a.contact_email}</a>
                    {a.website_url && <> · <a className="link" href={a.website_url} target="_blank" rel="noreferrer">{a.website_url.replace(/^https?:\/\//, "")}</a></>}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    {(a.interested_slots as SlotKind[]).map((k) => SLOT_KIND_LABEL[k]).join(", ") || "No placements picked"}
                    {a.budget_range && <> · Budget {a.budget_range}</>}
                    {" · "}{new Date(a.created_at).toLocaleDateString("en-US", { timeZone: "America/New_York" })}
                  </p>
                  {a.message && <p className="text-sm mt-3 whitespace-pre-wrap">{a.message}</p>}
                </div>
                <div className="flex md:flex-col gap-2 items-start">
                  {a.status !== "accepted" && a.status !== "declined" && (
                    <>
                      <ActionForm action={acceptApplication} submit="Accept + invite" submitClass="btn btn-primary btn-sm">
                        <input type="hidden" name="id" value={a.id} />
                      </ActionForm>
                      {a.status === "new" && (
                        <form action={setApplicationStatus}>
                          <input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="contacted" />
                          <button className="btn btn-sm">Mark contacted</button>
                        </form>
                      )}
                      <form action={setApplicationStatus}>
                        <input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="declined" />
                        <button className="btn btn-sm btn-danger">Decline</button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
