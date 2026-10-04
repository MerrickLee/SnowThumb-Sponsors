"use client";

import { useState } from "react";

/** A server-action button that asks inline before doing something that can't be undone. */
export function ConfirmAction({
  action, fields, label, question, confirm, className = "btn btn-sm btn-danger",
}: {
  action: (f: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  question: string;
  confirm: string;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className={className} onClick={() => setAsking(true)}>{label}</button>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" role="group" aria-label={question}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <span className="text-sm text-bad">{question}</span>
      <button className="btn btn-sm btn-danger" autoFocus>{confirm}</button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsking(false)}>Cancel</button>
    </form>
  );
}
