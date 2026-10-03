"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Handles both link styles Supabase sends:
//  - magic links (PKCE)  -> ?code=...
//  - admin invites        -> #access_token=...&refresh_token=...
function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const next = params.get("next") || "/";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

    (async () => {
      const code = params.get("code");
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const errDesc = params.get("error_description") || hash.get("error_description");
      const nice = (m: string) =>
        /code verifier|both auth code and code verifier/i.test(m)
          ? "This link was opened in a different browser than the one that requested it. Request a new link and open it here."
          : /expired|invalid|not found/i.test(m) ? "This sign-in link has expired or was already used. Only the newest link works." : m;
      if (errDesc) return setError(nice(errDesc));

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return setError(nice(error.message));
      } else if (hash.get("access_token") && hash.get("refresh_token")) {
        const { error } = await supabase.auth.setSession({
          access_token: hash.get("access_token")!,
          refresh_token: hash.get("refresh_token")!,
        });
        if (error) return setError(error.message);
      } else {
        return setError("This sign-in link is missing its token. Request a new one.");
      }
      router.replace(safeNext);
      router.refresh();
    })();
  }, [params, router]);

  return (
    <main className="flex-1 grid place-items-center px-4">
      {error ? (
        <div className="card p-5 max-w-sm text-sm">
          <p className="text-bad font-semibold">Sign-in didn&apos;t work</p>
          <p className="mt-2 text-muted">{error}</p>
          <a className="btn btn-primary mt-4" href="/login">Get a new link</a>
        </div>
      ) : (
        <p className="text-muted">Signing you in…</p>
      )}
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
