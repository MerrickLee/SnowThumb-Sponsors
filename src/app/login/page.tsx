"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const noSponsor = params.get("error") === "no_sponsor";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const next = params.get("next") ?? "/";
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false, // sponsors are invited; no open sign-up
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setState("error");
      setMessage(
        error.message.toLowerCase().includes("signups not allowed") || error.status === 422
          ? "That email doesn't have access yet. If you applied to sponsor, we'll send an invite once you're approved."
          : error.message,
      );
      return;
    }
    setState("sent");
  }

  return (
    <main className="flex-1 grid place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <p className="text-xs font-semibold tracking-[.2em] text-accent uppercase">SnowThumb</p>
        <h1 className="text-2xl font-semibold mt-1">Sponsor console</h1>
        <p className="text-muted text-sm mt-2">We&apos;ll email you a sign-in link. No password.</p>

        {noSponsor && (
          <p className="mt-4 text-sm text-warn">
            Your account isn&apos;t linked to a sponsor yet. Contact SnowThumb to finish setup.
          </p>
        )}

        {state === "sent" ? (
          <div className="card p-4 mt-6 text-sm">
            Check <strong>{email}</strong> for your sign-in link. It expires in an hour.
          </div>
        ) : (
          <form onSubmit={send} className="mt-6 space-y-3">
            <div>
              <label className="label" htmlFor="email">Work email</label>
              <input id="email" type="email" required className="input" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <button className="btn btn-primary w-full" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Email me a link"}
            </button>
            {state === "error" && <p className="text-sm text-bad">{message}</p>}
          </form>
        )}

        <p className="text-muted text-sm mt-8">
          Want to sponsor SnowThumb? <a className="link" href="/apply">Apply here</a>.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
