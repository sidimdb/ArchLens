import type { IssueStatus } from "../lib/types";

const META: Record<
  IssueStatus,
  { label: string; bg: string; fg: string }
> = {
  open: {
    label: "Open",
    bg: "bg-status-info/15",
    fg: "text-status-info",
  },
  in_progress: {
    label: "In progress",
    bg: "bg-status-warn/15",
    fg: "text-status-warn",
  },
  resolved: {
    label: "Resolved",
    bg: "bg-status-pass/15",
    fg: "text-status-pass",
  },
  wont_fix: {
    label: "Won't fix",
    bg: "bg-surface-container-high",
    fg: "text-on-surface-variant",
  },
};

export function StatusChip({ status }: { status: IssueStatus }) {
  const m = META[status];
  return (
    <span
      className={`inline-flex items-center px-stack-sm py-[2px] rounded text-mono-label uppercase tracking-widest font-bold ${m.bg} ${m.fg}`}
    >
      {m.label}
    </span>
  );
}
