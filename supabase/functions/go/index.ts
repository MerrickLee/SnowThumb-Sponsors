// GET /functions/v1/go?cr=<creative_id>&i=<install_id>&p=<platform>
// GET /functions/v1/go?g=<gear_item_id>&i=<install_id>&p=<platform>
// Logs a click, then 302s to the sponsor's link with UTM params.
// Only ever redirects to a link stored in the database (no open redirect).
import { admin } from "../_shared/util.ts";

const FALLBACK = Deno.env.get("CLICK_FALLBACK_URL") ?? "https://snowthumb.com";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GEAR = /^[a-z0-9_]{3,64}$/;

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 64) || "campaign";
}

function redirect(to: string) {
  return new Response(null, { status: 302, headers: { Location: to, "Cache-Control": "no-store" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const cr = url.searchParams.get("cr");
  const g = url.searchParams.get("g");
  const installRaw = url.searchParams.get("i") ?? "";
  const install = UUID.test(installRaw) ? installRaw : crypto.randomUUID();
  const platform = url.searchParams.get("p") ?? "unknown";

  // deno-lint-ignore no-explicit-any
  let row: any = null;
  let content = "";
  if (cr && UUID.test(cr)) {
    const { data } = await admin
      .from("creatives")
      .select("id, slot_id, campaigns(link_url, utm_campaign, name)")
      .eq("id", cr)
      .maybeSingle();
    row = data;
    content = data?.slot_id ?? "";
  } else if (g && GEAR.test(g)) {
    const { data } = await admin
      .from("gear_items")
      .select("id, campaigns(link_url, utm_campaign, name), sponsors(website_url)")
      .eq("id", g)
      .maybeSingle();
    row = data;
    content = data?.id ?? "";
  }

  const campaign = row?.campaigns ?? null;
  const link: string | null = campaign?.link_url ?? row?.sponsors?.website_url ?? null;
  if (!row || !link || !/^https?:\/\//.test(link)) return redirect(FALLBACK);

  let dest: URL;
  try {
    dest = new URL(link);
  } catch {
    return redirect(FALLBACK);
  }
  if (!dest.searchParams.has("utm_source")) dest.searchParams.set("utm_source", "snowthumb");
  if (!dest.searchParams.has("utm_medium")) dest.searchParams.set("utm_medium", "in_app");
  if (!dest.searchParams.has("utm_campaign")) {
    dest.searchParams.set("utm_campaign", campaign?.utm_campaign ?? slug(campaign?.name ?? "sponsor"));
  }
  if (!dest.searchParams.has("utm_content") && content) dest.searchParams.set("utm_content", content);

  // Log the click; never block the redirect on it.
  const { error } = await admin.rpc("ingest_events", {
    p_events: [{
      client_event_id: crypto.randomUUID(),
      type: "click",
      occurred_at: new Date().toISOString(),
      install_id: install,
      platform,
      creative_id: cr && UUID.test(cr) ? cr : "",
      gear_item_id: g && GEAR.test(g) ? g : "",
    }],
  });
  if (error) console.error("click log failed", error);

  return redirect(dest.toString());
});
