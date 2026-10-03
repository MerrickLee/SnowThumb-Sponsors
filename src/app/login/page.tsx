"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Brand";

const COOLDOWN = 60;

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const noSponsor = params.get("error") === "no_sponsor";

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("Enter the email address you were invited with.");
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
      setState("idle");
      const m = error.message.toLowerCase();
      if (m.includes("signups not allowed") || m.includes("not found") || error.status === 422) {
        setError("That email doesn't have access yet. If you applied to sponsor, we'll send an invite once you're approved.");
      } else if (m.includes("rate") || error.status === 429) {
        setError("Too many sign-in emails in a short time. Wait a minute and try again.");
      } else {
        setError(error.message);
      }
      return;
    }
    setState("sent");
    setWait(COOLDOWN);
  }

  return (
    <main id="main" className="flex-1 grid lg:grid-cols-2">
      <section className="flex flex-col px-5 sm:px-10 py-8">
        <Logo height={28} href="/apply" />
        <div className="flex-1 grid place-items-center py-10">
          <div className="w-full max-w-sm">
            <p className="eyebrow text-sky">Sponsor console</p>
            <h1 className="title text-4xl mt-2">Sign in</h1>
            <p className="text-muted mt-2">We&apos;ll email you a one-time link. No password to remember.</p>

            {noSponsor && (
              <div className="notice notice-warn mt-5">Your account isn&apos;t linked to a sponsor yet. Email sponsors@snowthumb.com and we&apos;ll finish setup.</div>
            )}

            {state === "sent" ? (
              <div className="mt-6 space-y-4" role="status" aria-live="polite">
                <div className="notice notice-ok">
                  Check <strong>{email}</strong> for your sign-in link. It works once and expires in an hour.
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn" onClick={() => send()} disabled={wait > 0}>
                    {wait > 0 ? `Resend in ${wait}s` : "Resend link"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setState("idle"); setError(""); }}>Use a different email</button>
                </div>
                <p className="text-sm text-muted">Not seeing it? Check spam or promotions, and make sure this is the address your invite went to.</p>
              </div>
            ) : (
              <form onSubmit={send} className="mt-6 space-y-4" noValidate>
                <div>
                  <label className="label" htmlFor="email">Work email</label>
                  <input id="email" type="email" required className="input" value={email} autoFocus
                    onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email"
                    aria-invalid={error ? true : undefined} aria-describedby={error ? "login-error" : undefined} />
                </div>
                {error && <p id="login-error" className="text-sm text-bad" role="alert">{error}</p>}
                <button className="btn btn-primary w-full" disabled={state === "sending"}>
                  {state === "sending" ? "Sending link…" : "Email me a sign-in link"}
                </button>
              </form>
            )}

            <p className="text-sm text-muted mt-10 pt-6 border-t border-line">
              Not a sponsor yet? <a className="link" href="/apply">See placements and apply</a>
            </p>
          </div>
        </div>
      </section>
      <aside className="hidden lg:flex relative overflow-hidden bg-gradient-to-b from-[#dcecfb] to-[#bfdcf6] items-center justify-center" aria-hidden="true">
        <div className="absolute top-12 left-12 right-12">
          <p className="eyebrow">Sponsor console</p>
          <p className="display text-5xl mt-3 max-w-md">Your board.<br /><span className="text-sky">Their next run.</span></p>
        </div>
        <div className="w-64 mt-40 rounded-[2rem] border-[6px] border-text bg-text shadow-2xl overflow-hidden rotate-[-3deg]">
          <Image src="/brand/gameplay-board.jpg" alt="" width={600} height={1299} sizes="256px" className="w-full h-auto rounded-[1.5rem]" priority />
        </div>
      </aside>
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
