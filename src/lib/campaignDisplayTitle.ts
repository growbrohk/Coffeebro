import { voucherOfferLabel } from "./voucherOfferLabels";

export type CampaignDisplayTitleVoucher = {
  offer_type: string;
  item_name?: string | null;
};

export function buildCampaignDisplayTitle(opts: {
  campaignType: "grab" | "hunt";
  rewardMode: "fixed" | "random";
  vouchers: CampaignDisplayTitleVoucher[];
}): string {
  const { campaignType, rewardMode, vouchers } = opts;
  const modeWord = campaignType === "hunt" ? "Hunt" : "Grab";

  if (rewardMode === "fixed" && vouchers.length >= 1) {
    const v = vouchers[0];
    const offer = voucherOfferLabel(v.offer_type);
    const name = v.item_name?.trim() || "Reward";
    return `${modeWord} · ${offer} · ${name}`;
  }

  if (rewardMode === "random") {
    const n = vouchers.length;
    const prizeWord = n === 1 ? "prize" : "prizes";
    return `${modeWord} · Random · ${n} ${prizeWord}`;
  }

  return `${modeWord} · Draft`;
}
