import { Button } from "@/components/ui/button";
import {
  VoucherDefinitionCard,
  newVoucherDraft,
  type VoucherDraft,
} from "@/components/campaigns/vouchers/VoucherDefinitionCard";
import type { MenuItemRow } from "@/hooks/useOrgMenuItems";

type Props = {
  rewardMode: "fixed" | "random";
  vouchers: VoucherDraft[];
  menuItems: MenuItemRow[];
  onChange: (v: VoucherDraft[]) => void;
  disabled?: boolean;
};

export function CampaignVouchersSection({ rewardMode, vouchers, menuItems, onChange, disabled }: Props) {
  const canAdd = rewardMode === "random" || vouchers.length === 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Vouchers</h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || !canAdd}
          onClick={() => onChange([...vouchers, newVoucherDraft(vouchers.length)])}
        >
          Add voucher
        </Button>
      </div>
      {rewardMode === "fixed" && (
        <p className="text-sm text-muted-foreground">Fixed mode allows exactly one voucher row.</p>
      )}
      <div className="space-y-4">
        {vouchers.map((v, i) => (
          <VoucherDefinitionCard
            key={v.clientKey}
            index={i}
            value={v}
            menuItems={menuItems}
            onChange={(next) => {
              const copy = [...vouchers];
              copy[i] = next;
              onChange(copy);
            }}
            onRemove={() => onChange(vouchers.filter((_, j) => j !== i))}
            canRemove={vouchers.length > 0}
            disabled={disabled}
            blockB1g1CustomText
          />
        ))}
      </div>
      {vouchers.length === 0 && (
        <p className="text-sm text-muted-foreground">Add at least one voucher definition.</p>
      )}
    </section>
  );
}

export type { VoucherDraft };
