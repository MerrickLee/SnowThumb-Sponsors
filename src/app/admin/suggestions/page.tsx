import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GEAR_REQUEST_BUCKET, validateGearSuggestion, type GearSuggestion } from "@/lib/gear-suggestion-input";
import { Empty, PageHeader } from "@/components/Shell";

type ReceivedIdea = GearSuggestion & { received_at: string };

export default async function Suggestions({ searchParams }: PageProps<"/admin/suggestions">) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.min(10000, Math.max(0, Number.parseInt(String(params.page ?? "0"), 10) || 0));
  const bucket = createAdminClient().storage.from(GEAR_REQUEST_BUCKET);
  const { data: files, error } = await bucket.list("inbox", { limit: 41, offset: page * 40, sortBy: { column: "created_at", order: "desc" } });
  const ideas: ReceivedIdea[] = [];
  let failed = Boolean(error);
  const shown = (files ?? []).slice(0, 40);
  for (let start = 0; start < shown.length; start += 8) {
    const results = await Promise.all(shown.slice(start, start + 8).map(async (file): Promise<ReceivedIdea | null> => {
      if (!/^[a-f0-9-]{36}\.json$/.test(file.name)) return null;
      const { data: body, error: downloadError } = await bucket.download(`inbox/${file.name}`);
      if (downloadError || !body) return null;
      try {
        const raw = JSON.parse(await body.text());
        const valid = validateGearSuggestion(raw);
        if (valid && typeof raw.received_at === "string") return { ...valid, received_at: raw.received_at };
      } catch { return null; }
      return null;
    }));
    for (const result of results) { if (result) ideas.push(result); else failed = true; }
  }
  ideas.sort((a, b) => b.received_at.localeCompare(a.received_at));
  return <>
    <PageHeader title="Player gear ideas" sub="Private requests from the game. Email is optional and is only for replying to the idea. Test requests are kept separately." />
    {failed && <p role="alert" className="notice notice-bad mb-4">Some requests could not be loaded. Try again before treating this inbox as complete.</p>}
    {!ideas.length && !failed ? <Empty title="No gear ideas on this page">Suggestions sent from the updated Gear Room will appear here.</Empty> :
      <div className="space-y-4">{ideas.map((idea) => <article key={idea.request_id} className="card p-5">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold capitalize">{idea.category} idea</h2><time className="text-sm text-muted">{new Date(idea.received_at).toLocaleString("en-US", { timeZone: "America/New_York" })}</time></div>
        <p className="mt-3 whitespace-pre-wrap break-words">{idea.idea}</p>
        <p className="text-sm text-muted mt-4">SnowThumb {idea.app_version} · {idea.platform}</p>
        {idea.email ? <a className="link text-sm mt-2 inline-block" href={`mailto:${idea.email}?subject=Your%20SnowThumb%20gear%20idea`}>{idea.email}</a> : <p className="text-sm text-muted mt-2">No reply email provided</p>}
      </article>)}</div>}
    <nav className="flex gap-3 mt-6" aria-label="Suggestion pages">
      {page > 0 && <a className="btn" href={`?page=${page - 1}`}>Newer ideas</a>}
      {(files?.length ?? 0) > 40 && <a className="btn" href={`?page=${page + 1}`}>Older ideas</a>}
    </nav>
  </>;
}
