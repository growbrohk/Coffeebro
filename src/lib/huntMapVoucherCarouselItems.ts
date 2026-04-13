import type { CampaignMapItem } from "@/types/campaignMapItem";

/** Hunt & grab pins the user has not completed yet, optionally narrowed by search (map bottom sheet carousel). */
export function huntMapVoucherCarouselItems(
  campaignItems: CampaignMapItem[],
  searchQuery: string,
): CampaignMapItem[] {
  const q = searchQuery.trim().toLowerCase();
  const matches = (t: CampaignMapItem) => {
    if (!q) return true;
    const hay = [t.name, t.address, t.offerTitle, t.orgName, t.campaignTitle]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };
  return campaignItems.filter(
    (t) => !t.scanned && (t.pinKind === "grab" || t.pinKind === "hunt") && matches(t),
  );
}
