"use client";

import { useState } from "react";

/** Two-step inline confirm instead of a browser dialog. */
export function DeleteDraft({ action, id }: { action: (f: FormData) => Promise<void>; id: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <button type="button" className="btn btn-ghost text-bad" onClick={() => setConfirming(true)}>Delete draft</button>;
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-bad">Delete this draft and its uploads?</span>
      <button className="btn btn-sm btn-danger">Delete</button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>Keep</button>
    </form>
  );
}
