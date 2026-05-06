/** Display-only hints. Authoritative amounts come from `compute_campaign_claim_amount_cents` (server). */

export function offerTypeRequiresPayment(offerType: string | null | undefined): boolean {
  const t = offerType?.trim();
  if (!t || t === "free") return false;
  return true;
}

/** Paid offers are only meaningful in fixed reward mode in this MVP. */
export function fixedCampaignRequiresPayment(
  rewardMode: string,
  firstVoucherOfferType: string | null | undefined,
): boolean {
  if (rewardMode !== "fixed") return false;
  return offerTypeRequiresPayment(firstVoucherOfferType);
}

export function displayAmountCentsFromFixedTier(offerType: string): number | null {
  const m = offerType.trim().match(/^fixed_price_(\d+)$/);
  if (!m) return null;
  return Number(m[1]) * 100;
}

export function displayAmountCentsForVoucherLine(
  offerType: string,
  basePriceHkd: number | null | undefined,
): number | null {
  const ot = offerType.trim();
  if (ot === "free") return 0;
  if (ot === "b1g1") {
    if (basePriceHkd == null || !Number.isFinite(Number(basePriceHkd))) return null;
    return Math.round(Number(basePriceHkd) * 100);
  }
  return displayAmountCentsFromFixedTier(ot);
}

export function formatHkdFromCents(cents: number): string {
  const dollars = cents / 100;
  const frac = cents % 100;
  return `HK$${dollars.toFixed(frac === 0 ? 0 : 2)}`;
}
