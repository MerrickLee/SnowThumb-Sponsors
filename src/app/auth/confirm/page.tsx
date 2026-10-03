import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Brand";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

// Email links land here: /auth/confirm?token_hash=...&type=magiclink|invite|...&next=/portal
// Nothing is verified on GET, so link scanners can't burn the token.
// The sponsor taps Continue, which POSTs to /auth/verify.
export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const tokenHash = one("token_hash");
  const type = one("type");
  const next = one("next") || "/";
  if (!tokenHash || !type) redirect("/login?error=link_invalid");

  const invite = type === "invite";
  return (
    <main id="main" className="flex-1 grid place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Logo height={28} href="/apply" />
        <div className="card p-6 mt-8">
          <p className="eyebrow text-sky">{invite ? "Welcome" : "Sponsor console"}</p>
          <h1 className="title text-3xl mt-2">{invite ? "Open your console" : "Finish signing in"}</h1>
          <p className="text-muted mt-2">
            {invite ? "You're approved as a SnowThumb sponsor. Continue to set up your first campaign." : "Tap continue to sign in on this device."}
          </p>
          <form action="/auth/verify" method="post" className="mt-6">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={next} />
            <button className="btn btn-primary w-full" autoFocus>Continue</button>
          </form>
          <p className="hint mt-4">This extra step keeps email scanners from using up your one-time link.</p>
        </div>
        <p className="text-sm text-muted mt-6 text-center">
          Link not working? <a className="link" href="/login">Request a new one</a>
        </p>
      </div>
    </main>
  );
}
