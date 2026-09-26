import { voucherOfferLabel, voucherItemLabel, type VoucherItemLabelSource } from "./voucherOfferLabels";

export type CampaignDisplayTitleVoucher = VoucherItemLabelSource & {
  offer_type: string;
};

export function buildCampaignDisplayTitle(opts: {
  campaignType: "grab" | "hunt";
  rewardMode: "fixed" | "random";
  vouchers: CampaignDisplayTitleVoucher[];
  menuNamesById?: Record<string, string>;
}): string {
  const { campaignType, rewardMode, vouchers, menuNamesById } = opts;
  const modeWord = campaignType === "hunt" ? "Hunt" : "Grab";

  if (rewardMode === "fixed" && vouchers.length >= 1) {
    const v = vouchers[0];
    const offer = voucherOfferLabel(v.offer_type);
    const name = voucherItemLabel(v, menuNamesById);
    return `${modeWord} · ${offer} · ${name}`;
  }

  if (rewardMode === "random") {
    const n = vouchers.length;
    const prizeWord = n === 1 ? "prize" : "prizes";
    return `${modeWord} · Random · ${n} ${prizeWord}`;
  }

  return `${modeWord} · Draft`;
}
