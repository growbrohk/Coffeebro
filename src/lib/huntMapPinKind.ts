export type HuntMapPinKind = "coffee_shop" | "grab" | "hunt";

export function pinKindFromCampaignType(campaignType: string | null | undefined): HuntMapPinKind {
  if (campaignType === "grab") return "grab";
  if (campaignType === "hunt") return "hunt";
  return "hunt";
}

/** @deprecated legacy offer-based pins */
export function pinKindFromOfferType(offerType: string | null | undefined): HuntMapPinKind | null {
  if (!offerType) return null;
  if (offerType === "buy1get1free") return "grab";
  if (offerType === "free") return "hunt";
  if (/^\$\d+$/.test(offerType)) return "hunt";
  if (/^\$\d+coffee$/i.test(offerType)) return "hunt";
  return "hunt";
}

/** @deprecated legacy offer-based pins */
export function pinKindForTreasure(primaryOfferType: string | null | undefined): HuntMapPinKind {
  const k = pinKindFromOfferType(primaryOfferType);
  return k ?? "coffee_shop";
}
