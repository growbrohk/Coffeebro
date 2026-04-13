/** Format a campaign boundary for display in the user's locale. */
export function formatCampaignInstant(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** Compact "12 Apr, 18:45" style for availability ranges (locale-aware). */
export function formatCampaignInstantCompact(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const datePart = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(d);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${datePart}, ${timePart}`;
}
