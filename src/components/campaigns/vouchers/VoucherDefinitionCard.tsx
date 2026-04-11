import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MenuItemPicker } from "@/components/campaigns/vouchers/MenuItemPicker";
import { allowedFulfillmentRules, allowedTemperatureRules } from "@/components/campaigns/vouchers/voucherRules";
import type { MenuItemRow } from "@/hooks/useOrgMenuItems";
import { Trash2 } from "lucide-react";

export type VoucherDraft = {
  clientKey: string;
  id?: string;
  menu_item_id: string;
  offer_type: "free" | "b1g1" | "fixed_price_17";
  redeem_valid_days: number;
  quantity: number;
  temperature_rule: string;
  fulfillment_rule: string;
  sort_order: number;
};

type Props = {
  index: number;
  value: VoucherDraft;
  menuItems: MenuItemRow[];
  onChange: (next: VoucherDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
};

export function VoucherDefinitionCard({
  index,
  value,
  menuItems,
  onChange,
  onRemove,
  canRemove,
  disabled,
}: Props) {
  const menu = menuItems.find((m) => m.id === value.menu_item_id);
  const tempOpts = menu ? allowedTemperatureRules(menu) : [];
  const fulfillOpts = menu ? allowedFulfillmentRules(menu) : [];

  const patch = (p: Partial<VoucherDraft>) => onChange({ ...value, ...p });

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Voucher {index + 1}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid gap-2">
        <Label>Offer</Label>
        <Select
          value={value.offer_type}
          onValueChange={(offer_type) => patch({ offer_type: offer_type as VoucherDraft["offer_type"] })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="b1g1">Buy 1 get 1</SelectItem>
            <SelectItem value="fixed_price_17" disabled={!menu || menu.category !== "coffee"}>
              $17 fixed (coffee only)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Menu item</Label>
        <MenuItemPicker
          items={menuItems}
          value={value.menu_item_id}
          onChange={(menu_item_id) => {
            const m = menuItems.find((x) => x.id === menu_item_id);
            const nextTemp = m ? allowedTemperatureRules(m)[0] : "n_a";
            const nextFul = m ? allowedFulfillmentRules(m)[0] : "all_supported";
            patch({ menu_item_id, temperature_rule: nextTemp, fulfillment_rule: nextFul });
          }}
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label>Pool quantity</Label>
        <Input
          type="number"
          min={1}
          value={value.quantity}
          onChange={(e) => patch({ quantity: Number(e.target.value) })}
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label>Valid days after claim</Label>
        <Input
          type="number"
          min={1}
          max={90}
          value={value.redeem_valid_days}
          onChange={(e) => patch({ redeem_valid_days: Number(e.target.value) })}
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label>Temperature rule</Label>
        <Select
          value={value.temperature_rule}
          onValueChange={(temperature_rule) => patch({ temperature_rule })}
          disabled={disabled || !menu}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tempOpts.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Fulfillment rule</Label>
        <Select
          value={value.fulfillment_rule}
          onValueChange={(fulfillment_rule) => patch({ fulfillment_rule })}
          disabled={disabled || !menu}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fulfillOpts.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
