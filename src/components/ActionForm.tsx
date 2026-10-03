"use client";

import { useActionState } from "react";

type State = { error?: string; ok?: string };

/** Small wrapper so server-action forms show inline success/error feedback. */
export function ActionForm({
  action, children, submit, className, submitClass = "btn btn-primary",
}: {
  action: (s: State, f: FormData) => Promise<State>;
  children?: React.ReactNode;
  submit: string;
  className?: string;
  submitClass?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3 col-span-full">
        <button className={submitClass} disabled={pending}>{pending ? "Working…" : submit}</button>
        {state.error && <p className="text-sm text-bad">{state.error}</p>}
        {state.ok && <p className="text-sm text-ok">{state.ok}</p>}
      </div>
    </form>
  );
}
