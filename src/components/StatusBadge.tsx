const TONE: Record<string, string> = {
  draft: "text-muted border-line",
  pending: "text-warn border-warn/40",
  submitted: "text-warn border-warn/40",
  approved: "text-ok border-ok/40",
  rejected: "text-bad border-bad/40",
  paused: "text-muted border-line",
  archived: "text-muted border-line",
  retired: "text-muted border-line",
  new: "text-accent border-accent/40",
  contacted: "text-warn border-warn/40",
  accepted: "text-ok border-ok/40",
  declined: "text-muted border-line",
};

const LABEL: Record<string, string> = {
  submitted: "in review",
  rejected: "changes requested",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block text-xs font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5 ${TONE[status] ?? "text-muted border-line"}`}>
      {LABEL[status] ?? status}
    </span>
  );
}
