import { buildCampaignDisplayTitle } from "@/lib/campaignDisplayTitle";

type VoucherLite = { offer_type: string; item_name?: string | null };

type Props = {
  campaignType: "grab" | "hunt";
  rewardMode: "fixed" | "random";
  vouchers: VoucherLite[];
};

export function CampaignDisplayTitlePreview({ campaignType, rewardMode, vouchers }: Props) {
  const suggested = buildCampaignDisplayTitle({ campaignType, rewardMode, vouchers });
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">Suggested title: </span>
      <span className="font-medium">{suggested}</span>
    </div>
  );
}
