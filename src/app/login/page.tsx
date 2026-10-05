"use client";

import { track } from "@/lib/analytics";
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
  const urlError = params.get("error");
  const noSponsor = urlError === "no_sponsor";
  const linkProblem = urlError === "link_expired" || urlError === "link_invalid";

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
      track("signin_requested", { result: m.includes("signups not allowed") || m.includes("not found") || error.status === 422 ? "no_access" : m.includes("rate") || error.status === 429 ? "rate_limited" : "email_failed" });
      if (m.includes("signups not allowed") || m.includes("not found") || error.status === 422) {
        setError("That email doesn't have access yet. If you applied to sponsor, we'll send an invite once you're approved.");
      } else if (m.includes("rate") || m.includes("security purposes") || error.status === 429) {
        const secs = Number(error.message.match(/(\d+)\s*second/)?.[1] ?? 60);
        setWait(secs);
        setError(`For security, you can request a new link in ${secs} seconds. Use the newest email we sent; older links stop working.`);
      } else if (/hook|sending|email/i.test(error.message) || (error.status ?? 0) >= 500) {
        setError("We couldn't send your sign-in email. Try again in a minute, or email sponsors@snowthumb.com.");
      } else {
        setError(error.message);
      }
      return;
    }
    track("signin_requested", { result: "sent" });
    setState("sent");
    setWait(COOLDOWN);
  }

  return (
    <main id="main" className="flex-1 grid lg:grid-cols-2">
      <section className="flex flex-col px-5 sm:px-10 py-8">
        <Logo height={28} href="/apply" />
        <div className="flex-1 grid justify-items-center items-start lg:items-center py-6 lg:py-10">
          <div className="w-full max-w-sm">
            {/* Up top so new brands see it first (the cookie banner covers the bottom of the screen). */}
            <a href="/apply" onClick={() => track("become_sponsor_clicked", { from: "login" })}
              className="group block rounded-xl bg-text text-white p-5 mb-8 shadow-lg hover:bg-sky transition-colors">
              <p className="text-xs font-bold uppercase tracking-widest text-[#8cc8ff] group-hover:text-white">Not a sponsor yet?</p>
              <p className="title text-2xl mt-1">Become a SnowThumb sponsor</p>
              <p className="text-sm text-white/80 mt-1">Banners, boards and challenges players ride every day.</p>
              <span className="inline-flex items-center gap-1 mt-4 rounded-lg bg-white text-text px-4 py-2 text-sm font-bold">
                See placements and apply <span aria-hidden="true">→</span>
              </span>
            </a>
            <p className="eyebrow text-sky">Sponsor console</p>
            <h1 className="title text-4xl mt-2">Sign in</h1>
            <p className="text-muted mt-2">We&apos;ll email you a one-time link. No password to remember.</p>

            {linkProblem && (
              <div className="notice notice-warn mt-5" role="status">
                {urlError === "link_expired"
                  ? "That sign-in link has expired or was already used. Each link works once, and only the newest one works. Request a fresh link below."
                  : "That sign-in link didn't work. Request a fresh link below."}
              </div>
            )}
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
                <p className="text-sm text-muted">Not seeing it? Check spam or promotions. Only the newest link works, and you can open it on any device.</p>
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
                <button className="btn btn-primary w-full" disabled={state === "sending" || wait > 0}>
                  {state === "sending" ? "Sending link…" : wait > 0 ? `Try again in ${wait}s` : "Email me a sign-in link"}
                </button>
              </form>
            )}

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
