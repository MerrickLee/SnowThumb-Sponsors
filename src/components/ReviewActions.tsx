"use client";

import { track } from "@/lib/analytics";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const FUNCTIONS = process.env.NEXT_PUBLIC_FUNCTIONS_URL ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

type Target = { campaign_id: string } | { creative_id: string };

async function callReview(body: Target & { action: string; notes?: string }) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired. Sign in again.");
  const res = await fetch(`${FUNCTIONS}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error ?? `Review failed (${res.status})`) as Error & { failures?: string[] };
    err.failures = json.failures;
    throw err;
  }
  return json;
}

export function CampaignReview({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string; list?: string[] } | null>(null);

  async function run(action: "approve" | "reject") {
    if (action === "reject" && !notes.trim()) return setMsg({ tone: "bad", text: "Add a note so the sponsor knows what to change." });
    setBusy(true); setMsg(null);
    try {
      const r = await callReview({ campaign_id: campaignId, action, notes });
      track("campaign_reviewed", { campaign_id: campaignId, decision: action === "approve" ? "approved" : "sent_back" });
      setMsg({ tone: "ok", text: action === "approve" ? `Approved. ${r.published ?? 0} file(s) published. Live on next app open.` : "Sent back to the sponsor." });
      router.refresh();
    } catch (e) {
      const err = e as Error & { failures?: string[] };
      setMsg({ tone: "bad", text: err.message, list: err.failures });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor={`notes-${campaignId}`}>Notes to sponsor</label>
        <textarea id={`notes-${campaignId}`} className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Required when sending back. Optional on approve." />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={busy} onClick={() => run("approve")}>{busy ? "Working…" : "Approve + publish"}</button>
        <button className="btn btn-danger" disabled={busy} onClick={() => run("reject")}>Send back</button>
      </div>
      {msg && (
        <div className={`text-sm ${msg.tone === "ok" ? "text-ok" : "text-bad"}`}>
          {msg.text}
          {msg.list && <ul className="list-disc ml-5 mt-1">{msg.list.map((f) => <li key={f}>{f}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}

export function CreativeReview({ creativeId, status }: { creativeId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");
  async function run(action: "approve" | "reject" | "retire") {
    if (action === "reject" && !notes.trim()) return setErr("Say what to change.");
    setBusy(true); setErr("");
    try { await callReview({ creative_id: creativeId, action, notes: notes || undefined }); setRejecting(false); router.refresh(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status !== "approved" && <button className="btn btn-sm" disabled={busy} onClick={() => run("approve")}>Approve file</button>}
        {status !== "rejected" && status !== "approved" && !rejecting && (
          <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => setRejecting(true)}>Reject file</button>
        )}
        {status === "approved" && <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => run("retire")}>Pull from app</button>}
      </div>
      {rejecting && (
        <div className="flex gap-2">
          <input className="input" placeholder="What should change on this file?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => run("reject")}>Send</button>
          <button className="btn btn-sm" onClick={() => { setRejecting(false); setErr(""); }}>Cancel</button>
        </div>
      )}
      {err && <p className="text-xs text-bad">{err}</p>}
    </div>
  );
}
