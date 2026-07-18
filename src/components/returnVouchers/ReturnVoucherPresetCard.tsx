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

const FIXED_PRICE_TIERS = ["fixed_price_7", "fixed_price_17", "fixed_price_20", "fixed_price_27"] as const;

export type ReturnVoucherPresetDraft = {
  clientKey: string;
  id?: string;
  title: string;
  menu_item_id: string;
  offer_type: "free" | "b1g1" | (typeof FIXED_PRICE_TIERS)[number];
  redeem_valid_days: number;
  quantity: number;
  temperature_rule: string;
  fulfillment_rule: string;
  sort_order: number;
};

function isFixedOfferType(ot: string): ot is (typeof FIXED_PRICE_TIERS)[number] {
  return (FIXED_PRICE_TIERS as readonly string[]).includes(ot);
}

function fixedTierFromOfferType(ot: string): (typeof FIXED_PRICE_TIERS)[number] {
  if (isFixedOfferType(ot)) return ot;
  return "fixed_price_17";
}

type Props = {
  index: number;
  value: ReturnVoucherPresetDraft;
  menuItems: MenuItemRow[];
  onChange: (next: ReturnVoucherPresetDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
};

export function ReturnVoucherPresetCard({
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
  const patch = (p: Partial<ReturnVoucherPresetDraft>) => onChange({ ...value, ...p });
  const offerKindValue = isFixedOfferType(value.offer_type) ? "fixed" : value.offer_type;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Preset {index + 1}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid gap-2">
        <Label>Title</Label>
        <Input
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
          disabled={disabled}
          placeholder="e.g. Come back free drink"
        />
      </div>
      <div className="grid gap-2">
        <Label>Offer</Label>
        <Select
          value={offerKindValue}
          onValueChange={(kind) => {
            if (kind === "fixed") {
              patch({ offer_type: fixedTierFromOfferType(value.offer_type) });
            } else {
              patch({ offer_type: kind as "free" | "b1g1" });
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="b1g1">Buy 1 get 1</SelectItem>
            <SelectItem value="fixed">Fixed price</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {offerKindValue === "fixed" && (
        <div className="grid gap-2">
          <Label>Fixed price</Label>
          <Select
            value={fixedTierFromOfferType(value.offer_type)}
            onValueChange={(tier) => patch({ offer_type: tier as ReturnVoucherPresetDraft["offer_type"] })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed_price_7">$7</SelectItem>
              <SelectItem value="fixed_price_17">$17</SelectItem>
              <SelectItem value="fixed_price_20">$20</SelectItem>
              <SelectItem value="fixed_price_27">$27</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
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

export function newReturnVoucherPresetDraft(sort: number): ReturnVoucherPresetDraft {
  return {
    clientKey: crypto.randomUUID(),
    title: "",
    menu_item_id: "",
    offer_type: "free",
    redeem_valid_days: 7,
    quantity: 10,
    temperature_rule: "all_supported",
    fulfillment_rule: "all_supported",
    sort_order: sort,
  };
}
