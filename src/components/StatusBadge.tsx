const TONE: Record<string, string> = {
  draft: "bg-surface-2 text-muted border-line",
  pending: "bg-warn-soft text-warn border-warn/30",
  submitted: "bg-warn-soft text-warn border-warn/30",
  approved: "bg-ok-soft text-ok border-ok/30",
  rejected: "bg-bad-soft text-bad border-bad/30",
  paused: "bg-surface-2 text-muted border-line",
  archived: "bg-surface-2 text-muted border-line",
  retired: "bg-surface-2 text-muted border-line",
  new: "bg-accent-soft text-accent border-accent/30",
  contacted: "bg-warn-soft text-warn border-warn/30",
  accepted: "bg-ok-soft text-ok border-ok/30",
  declined: "bg-surface-2 text-muted border-line",
};

const LABEL: Record<string, string> = {
  submitted: "In review",
  rejected: "Changes requested",
  approved: "Approved",
  pending: "Pending review",
  draft: "Draft",
  paused: "Paused",
  archived: "Archived",
  retired: "Removed",
  new: "New",
  contacted: "Contacted",
  accepted: "Accepted",
  declined: "Declined",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold border rounded-full px-2.5 py-1 whitespace-nowrap ${TONE[status] ?? "bg-surface-2 text-muted border-line"}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABEL[status] ?? status}
    </span>
  );
}
