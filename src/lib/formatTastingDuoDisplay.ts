export type TastingDuoDisplay = {
  compact: string;
  lines?: [string, string];
};

export function formatTastingDuoDisplay(names: [string, string]): TastingDuoDisplay {
  const a = names[0].trim();
  const b = names[1].trim();
  const drink1 = a || "Drink 1";
  const drink2 = b || "Drink 2";

  if (a.toLowerCase() === b.toLowerCase() && a.length > 0) {
    return { compact: `${a} × 2` };
  }

  return {
    compact: `${drink1} + ${drink2}`,
    lines: [`1. ${drink1}`, `2. ${drink2}`],
  };
}
