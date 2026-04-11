import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CampaignDisplayTitlePreview } from "@/components/campaigns/CampaignDisplayTitlePreview";

type Props = {
  displayTitle: string;
  onDisplayTitle: (v: string) => void;
  campaignType: "grab" | "hunt";
  onCampaignType: (v: "grab" | "hunt") => void;
  rewardMode: "fixed" | "random";
  onRewardMode: (v: "fixed" | "random") => void;
  rewardPerAction: number;
  onRewardPerAction: (v: number) => void;
  previewVouchers: { offer_type: string; item_name?: string | null }[];
  disabled?: boolean;
};

export function CampaignBasicsSection({
  displayTitle,
  onDisplayTitle,
  campaignType,
  onCampaignType,
  rewardMode,
  onRewardMode,
  rewardPerAction,
  onRewardPerAction,
  previewVouchers,
  disabled,
}: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Basics</h2>
      <div className="grid gap-2">
        <Label htmlFor="camp-title">Display title</Label>
        <Input
          id="camp-title"
          value={displayTitle}
          onChange={(e) => onDisplayTitle(e.target.value)}
          disabled={disabled}
          placeholder="Shown to customers"
        />
        <CampaignDisplayTitlePreview
          campaignType={campaignType}
          rewardMode={rewardMode}
          vouchers={previewVouchers}
        />
      </div>
      <div className="grid gap-2">
        <Label>Campaign type</Label>
        <RadioGroup
          value={campaignType}
          onValueChange={(v) => onCampaignType(v as "grab" | "hunt")}
          className="flex flex-col gap-2"
          disabled={disabled}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="grab" id="ct-grab" />
            Grab (in-store claim)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="hunt" id="ct-hunt" />
            Hunt (QR at treasure)
          </label>
        </RadioGroup>
      </div>
      <div className="grid gap-2">
        <Label>Reward mode</Label>
        <RadioGroup
          value={rewardMode}
          onValueChange={(v) => onRewardMode(v as "fixed" | "random")}
          className="flex flex-col gap-2"
          disabled={disabled}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="fixed" id="rm-fixed" />
            Fixed (single voucher definition)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="random" id="rm-random" />
            Random pool
          </label>
        </RadioGroup>
      </div>
      {rewardMode === "random" && (
        <div className="grid gap-2">
          <Label htmlFor="rpa">Rewards per claim (1–10)</Label>
          <Input
            id="rpa"
            type="number"
            min={1}
            max={10}
            value={rewardPerAction}
            onChange={(e) => onRewardPerAction(Number(e.target.value))}
            disabled={disabled}
          />
        </div>
      )}
    </section>
  );
}
