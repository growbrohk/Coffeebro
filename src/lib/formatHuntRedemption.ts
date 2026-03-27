/** Compact redemption window e.g. "0800-1800" for popups/detail. */
export function formatHuntRedemptionPeriod(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined
): string | null {
  if (!startsAt && !endsAt) return null;
  const fmt = (s: string) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}${m}`;
  };
  if (startsAt && endsAt) {
    const a = fmt(startsAt);
    const b = fmt(endsAt);
    if (a && b) return `${a}-${b}`;
  }
  if (endsAt) {
    const b = fmt(endsAt);
    if (b) return `until ${b}`;
  }
  if (startsAt) {
    const a = fmt(startsAt);
    if (a) return `from ${a}`;
  }
  return null;
}
