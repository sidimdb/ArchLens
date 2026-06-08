/**
 * Tiny formatting helpers used across the dashboard.
 */

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return min + "m ago";
  const hr = Math.round(min / 60);
  if (hr < 24) return hr + "h ago";
  const days = Math.round(hr / 24);
  if (days < 30) return days + "d ago";
  return shortDate(iso);
}

export function sourceLabel(
  file: string | null,
  line: number | null
): string {
  if (!file) return "no source";
  const base = file.split(/[\\/]/).pop() ?? file;
  return line ? base + ":" + line : base;
}
