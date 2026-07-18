import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReturnVoucherPresetPreview } from "@/components/returnVouchers/ReturnVoucherPresetPreview";
import { useReturnVoucherPresets } from "@/hooks/useReturnVoucherPresets";

type Props = {
  orgId: string;
  value: string | null;
  onChange: (presetId: string | null) => void;
  disabled?: boolean;
};

export function CampaignReturnVoucherSection({ orgId, value, onChange, disabled }: Props) {
  const { data: presets = [], isLoading } = useReturnVoucherPresets(orgId);
  const selected = presets.find((p) => p.id === value) ?? null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Return voucher</h2>
          <p className="text-sm text-muted-foreground">Optional — minted when staff redeems a campaign voucher.</p>
        </div>
        {value ? (
          <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => onChange(null)}>
            Clear link
          </Button>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="return-voucher-preset">Link preset</Label>
        <Select
          value={value ?? "__none__"}
          onValueChange={(v) => onChange(v === "__none__" ? null : v)}
          disabled={disabled || isLoading}
        >
          <SelectTrigger id="return-voucher-preset">
            <SelectValue placeholder={isLoading ? "Loading…" : "None"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {presets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selected ? <ReturnVoucherPresetPreview preset={selected} /> : null}
    </section>
  );
}
