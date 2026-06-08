/**
 * Issue inbox — the dashboard's home screen.
 *
 * Same vertical list structure as before, just sharper visuals:
 * stronger title, solid-black active states on filter chips, denser
 * rows with a black left-edge accent on hover, status chip + category
 * grouped on the same top line.
 */

import { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { StatusChip } from "../components/StatusChip";
import { Spinner } from "../components/Spinner";
import { Icon } from "../components/Layout";
import { fetchIssues } from "../lib/queries";
import { relativeTime, sourceLabel } from "../lib/format";
import type { IssueListItem, IssueStatus } from "../lib/types";

const STATUS_FILTERS: { value: IssueStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "wont_fix", label: "Won't fix" },
];

export function Inbox({ onOpen }: { onOpen: (id: string) => void }) {
  const [issues, setIssues] = useState<IssueListItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IssueStatus | "all">("all");

  useEffect(() => {
    void fetchIssues()
      .then(setIssues)
      .catch((e) => setErr(e.message ?? String(e)));
  }, []);

  const visible = useMemo(() => {
    if (!issues) return null;
    if (statusFilter === "all") return issues;
    return issues.filter((i) => i.status === statusFilter);
  }, [issues, statusFilter]);

  const counts = useMemo(() => {
    if (!issues) return null;
    const c: Record<string, number> = { all: issues.length };
    for (const i of issues) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [issues]);

  return (
    <Layout
      title="Issues"
      subtitle={
        issues
          ? issues.length + " total · newest first"
          : "Loading session data…"
      }
    >
      {/* Filter chips — sharper: solid black active, clean outline inactive */}
      <div className="flex flex-wrap gap-stack-sm mb-stack-lg">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          const count = counts?.[f.value];
          return (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={
                "text-mono-label uppercase tracking-widest px-stack-md py-stack-xs rounded border transition-colors " +
                (active
                  ? "bg-on-surface text-surface border-on-surface"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:text-on-surface hover:border-on-surface")
              }
            >
              {f.label}
              {typeof count === "number" ? (
                <span className="ml-1.5 opacity-70">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {err ? (
        <div className="text-status-fail text-body-sm border-l-2 border-status-fail pl-stack-sm mb-stack-md">
          Failed to load issues: {err}
        </div>
      ) : null}

      {!visible ? (
        <div className="flex items-center gap-stack-sm text-on-surface-variant text-body-sm">
          <Spinner /> Loading…
        </div>
      ) : visible.length === 0 ? (
        <EmptyState statusFilter={statusFilter} totalCount={issues?.length ?? 0} />
      ) : (
        <ul className="divide-y divide-outline-variant rounded border border-on-surface bg-surface-container-lowest overflow-hidden shadow-sm">
          {visible.map((issue) => (
            <li key={issue.id}>
              <button
                onClick={() => onOpen(issue.id)}
                className="group w-full text-left flex items-stretch transition-colors hover:bg-surface-container-low"
              >
                {/* Hover accent — a black left edge that fades in on
                    hover, gives each row a visual "this is clickable"
                    cue without permanently coloring the list. */}
                <span
                  aria-hidden
                  className="w-[3px] shrink-0 bg-on-surface opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <div className="flex-1 min-w-0 px-stack-md py-stack-md flex items-center gap-stack-md">
                  <div className="flex-1 min-w-0">
                    {/* Top meta row — status, category, project · screen */}
                    <div className="flex items-center gap-stack-sm mb-stack-xs flex-wrap">
                      <StatusChip status={issue.status} />
                      {issue.category ? (
                        <span className="text-mono-label uppercase tracking-widest px-stack-sm py-[2px] rounded bg-on-surface text-surface font-bold">
                          {issue.category}
                        </span>
                      ) : null}
                      <span className="text-mono-label text-on-surface-variant">
                        {issue.project?.name ?? "—"} · {issue.screen_name}
                      </span>
                    </div>

                    {/* The note — primary content */}
                    <p className="text-body-sm text-on-surface font-medium truncate">
                      {issue.note || (
                        <span className="italic text-on-surface-variant font-normal">
                          (no note)
                        </span>
                      )}
                    </p>

                    {/* Bottom meta row — component, source, time */}
                    <div className="mt-stack-xs flex items-center gap-stack-md text-mono-label text-on-surface-variant font-mono flex-wrap">
                      <span>&lt;{issue.component_name}&gt;</span>
                      {issue.source_file ? (
                        <span>
                          {sourceLabel(issue.source_file, issue.source_line)}
                        </span>
                      ) : null}
                      <span>{relativeTime(issue.created_at)}</span>
                    </div>
                  </div>
                  <Icon
                    name="chevron_right"
                    className="text-on-surface-variant group-hover:text-on-surface text-[20px] shrink-0 transition-colors"
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}

function EmptyState({
  statusFilter,
  totalCount,
}: {
  statusFilter: IssueStatus | "all";
  totalCount: number;
}) {
  return (
    <div className="rounded border border-dashed border-outline-variant py-stack-lg px-margin-page text-center text-on-surface-variant">
      <Icon
        name="check_circle"
        className="text-on-surface-variant text-[28px] mb-stack-sm"
      />
      <p className="text-body-sm">
        {totalCount === 0
          ? "No issues yet. As soon as a reviewer submits an audit, it'll appear here."
          : statusFilter === "all"
          ? "Nothing matches the current filter."
          : "No issues in this status."}
      </p>
    </div>
  );
}
