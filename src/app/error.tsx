"use client";

import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex-1 grid place-items-center px-4 py-16 text-center">
      <div className="max-w-md">
        <h1 className="title text-3xl">Something wiped out.</h1>
        <p className="text-muted mt-2">That didn&apos;t load. Try again, and if it keeps happening email sponsors@snowthumb.com{error.digest ? ` with code ${error.digest}` : ""}.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
          <Link className="btn" href="/">Back to console</Link>
        </div>
      </div>
    </main>
  );
}
