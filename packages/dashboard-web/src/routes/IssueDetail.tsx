/**
 * Issue detail — the screen a developer lives in to triage one issue.
 *
 * Left:  screenshot + element-highlight overlay. Sized to fit the
 *        viewport so the whole image is visible without scrolling.
 * Right: same section order as before — Status, Reviewer note,
 *        Element, Environment, Captured, Danger zone. Visuals are
 *        sharper now: stronger title, accented section headers, solid
 *        black for active states.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Layout, Icon } from "../components/Layout";
import { StatusChip } from "../components/StatusChip";
import { ScreenshotPreview } from "../components/ScreenshotPreview";
import { Spinner } from "../components/Spinner";
import { deleteIssue, fetchIssue, updateIssueStatus } from "../lib/queries";
import { shortDate, sourceLabel } from "../lib/format";
import type { IssueListItem, IssueStatus } from "../lib/types";

const STATUSES: { value: IssueStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "wont_fix", label: "Won't fix" },
];

export function IssueDetail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const [issue, setIssue] = useState<IssueListItem | null | undefined>(
    undefined
  );
  const [savingStatus, setSavingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Cap the screenshot to whatever fits below where the preview
  // begins, so a tall phone screenshot never spills off the viewport.
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [maxScreenshotHeight, setMaxScreenshotHeight] = useState(600);
  useLayoutEffect(() => {
    function recompute() {
      if (!previewRef.current) return;
      const top = previewRef.current.getBoundingClientRect().top;
      const fit = Math.max(280, window.innerHeight - top - 32);
      setMaxScreenshotHeight(fit);
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [issue]);

  useEffect(() => {
    setIssue(undefined);
    setErr(null);
    void fetchIssue(id)
      .then((row) => setIssue(row))
      .catch((e) => {
        setIssue(null);
        setErr(e.message ?? String(e));
      });
  }, [id]);

  async function changeStatus(next: IssueStatus) {
    if (!issue) return;
    setSavingStatus(true);
    setErr(null);
    try {
      await updateIssueStatus(issue.id, next);
      setIssue({ ...issue, status: next });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingStatus(false);
    }
  }

  async function onDelete() {
    if (!issue) return;
    const confirmed = window.confirm(
      "Delete this issue? This cannot be undone. The reviewer's note and screenshot will be permanently removed."
    );
    if (!confirmed) return;
    setDeleting(true);
    setErr(null);
    try {
      await deleteIssue(issue.id);
      onBack();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  }

  if (issue === undefined) {
    return (
      <Layout title="Issue">
        <div className="flex items-center gap-stack-sm text-on-surface-variant text-body-sm">
          <Spinner /> Loading…
        </div>
      </Layout>
    );
  }
  if (issue === null) {
    return (
      <Layout title="Issue not found">
        <p className="text-body-sm text-on-surface-variant mb-stack-md">
          {err ?? "This issue may have been deleted or you don't have access."}
        </p>
        <BackButton onBack={onBack} />
      </Layout>
    );
  }

  return (
    <Layout
      title="Issue"
      subtitle={
        (issue.project?.name ?? "Untitled project") +
        " · " +
        issue.screen_name
      }
      right={<BackButton onBack={onBack} />}
    >
      <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-margin-page items-start">
        {/* Left — screenshot */}
        <div ref={previewRef}>
          <ScreenshotPreview
            screenshotPath={issue.screenshot_path}
            bounds={issue.bounds}
            screenDims={issue.screen_dims}
            maxWidth={320}
            maxHeight={maxScreenshotHeight}
          />
          <p className="text-mono-label text-on-surface-variant mt-stack-sm italic">
            Highlight is drawn over the original screen.
          </p>
        </div>

        {/* Right — metadata + triage (same section order as before) */}
        <div className="space-y-stack-lg min-w-0">
          {/* Status workflow */}
          <section>
            <SectionHeader>Status</SectionHeader>
            <div className="flex items-center gap-stack-md flex-wrap">
              <StatusChip status={issue.status} />
              <div className="flex flex-wrap gap-stack-xs">
                {STATUSES.map((s) => {
                  const active = s.value === issue.status;
                  return (
                    <button
                      key={s.value}
                      onClick={() => void changeStatus(s.value)}
                      disabled={savingStatus || active}
                      className={
                        "text-mono-label uppercase tracking-widest px-stack-md py-[7px] rounded border transition-colors " +
                        (active
                          ? "bg-on-surface text-surface border-on-surface cursor-default"
                          : "border-outline-variant text-on-surface-variant hover:bg-on-surface hover:text-surface hover:border-on-surface")
                      }
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {err ? (
              <p className="text-status-fail text-mono-label mt-stack-sm">
                {err}
              </p>
            ) : null}
          </section>

          {/* Note */}
          <section>
            <SectionHeader>Reviewer note</SectionHeader>
            <div className="border-l-4 border-on-surface bg-surface-container-lowest pl-stack-md py-stack-sm pr-stack-md text-body-sm text-on-surface whitespace-pre-wrap rounded-r">
              {issue.note || (
                <span className="italic text-on-surface-variant">
                  (no note)
                </span>
              )}
            </div>
          </section>

          {/* Identity */}
          <section>
            <SectionHeader>Element</SectionHeader>
            <Meta
              label="Component"
              value={"<" + issue.component_name + ">"}
              mono
            />
            {issue.element_type ? (
              <Meta label="Kind" value={issue.element_type} />
            ) : null}
            {issue.hierarchy_path && issue.hierarchy_path.length > 0 ? (
              <Meta
                label="Path"
                value={issue.hierarchy_path.join("  ›  ")}
                mono
              />
            ) : null}
            {issue.source_file ? (
              <Meta
                label="Source"
                value={sourceLabel(issue.source_file, issue.source_line)}
                mono
              />
            ) : null}
            <Meta label="Screen" value={issue.screen_name} />
            <Meta label="Category" value={issue.category ?? "—"} />
            <Meta
              label="Bounds"
              value={
                Math.round(issue.bounds.width) +
                "×" +
                Math.round(issue.bounds.height) +
                " at (" +
                Math.round(issue.bounds.x) +
                ", " +
                Math.round(issue.bounds.y) +
                ")"
              }
              mono
            />
          </section>

          {/* Environment */}
          {(issue.os_name ||
            issue.os_version ||
            issue.device_brand ||
            issue.device_model) && (
            <section>
              <SectionHeader>Environment</SectionHeader>
              {issue.device_brand || issue.device_model ? (
                <Meta
                  label="Device"
                  value={[issue.device_brand, issue.device_model]
                    .filter(Boolean)
                    .join(" ")}
                />
              ) : null}
              {issue.os_name || issue.os_version ? (
                <Meta
                  label="OS"
                  value={[issue.os_name, issue.os_version]
                    .filter(Boolean)
                    .join(" ")}
                />
              ) : null}
            </section>
          )}

          {/* Captured */}
          <section>
            <SectionHeader>Captured</SectionHeader>
            <Meta label="At" value={shortDate(issue.captured_at)} />
            <Meta label="Stored at" value={shortDate(issue.created_at)} />
            <Meta label="Issue id" value={issue.id} mono />
          </section>

          {/* Danger zone */}
          <section className="border-t border-outline-variant pt-stack-lg">
            <SectionHeader>Danger zone</SectionHeader>
            <p className="text-body-sm text-on-surface-variant mb-stack-sm">
              Permanently removes the issue and its screenshot. The original
              reviewer's record is wiped — use only for spam, duplicates, or
              test data.
            </p>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="text-mono-label uppercase tracking-widest px-stack-md py-stack-sm rounded bg-status-fail text-white hover:bg-status-fail/90 disabled:opacity-40 transition-colors"
            >
              {deleting ? "Deleting…" : "Delete this issue"}
            </button>
          </section>
        </div>
      </div>
    </Layout>
  );
}

/**
 * Section header with a small black accent bar to its left — gives
 * each section a visual anchor without changing the layout.
 */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-stack-sm text-mono-label uppercase tracking-widest text-on-surface font-bold mb-stack-sm">
      <span
        aria-hidden
        className="inline-block w-1 h-3.5 bg-on-surface rounded-sm"
      />
      {children}
    </h2>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-stack-md mb-stack-xs">
      <div className="w-[110px] text-mono-label uppercase tracking-widest text-on-surface-variant">
        {label}
      </div>
      <div
        className={
          "flex-1 text-body-sm text-on-surface break-words " +
          (mono ? "font-mono" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="text-mono-label uppercase tracking-widest text-on-surface-variant hover:text-on-surface flex items-center gap-stack-xs"
    >
      <Icon name="arrow_back" className="text-[16px]" />
      Back to inbox
    </button>
  );
}
