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
import {
  ANY_MENU_ITEM,
  composeDiscountOffer,
  fixedTierFromOfferType,
  isDiscountOffer,
  maxDollarDiscountForPrice,
  offerKindOf,
  parseDiscountOffer,
  type DiscountOfferKind,
  type OfferKind,
} from "@/lib/voucherOfferType";
import { Trash2 } from "lucide-react";

export type ReturnVoucherPresetDraft = {
  clientKey: string;
  id?: string;
  title: string;
  menu_item_id: string;
  offer_type: string;
  redeem_valid_days: number;
  quantity: number;
  temperature_rule: string;
  fulfillment_rule: string;
  sort_order: number;
};

type Props = {
  index: number;
  value: ReturnVoucherPresetDraft;
  menuItems: MenuItemRow[];
  onChange: (next: ReturnVoucherPresetDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
};

function resolveMenu(value: ReturnVoucherPresetDraft, menuItems: MenuItemRow[]): MenuItemRow | undefined {
  if (!value.menu_item_id || value.menu_item_id === ANY_MENU_ITEM) return undefined;
  return menuItems.find((m) => m.id === value.menu_item_id);
}

function handleOfferKindChange(
  value: ReturnVoucherPresetDraft,
  kind: OfferKind,
): Partial<ReturnVoucherPresetDraft> {
  if (kind === "fixed") {
    return { offer_type: fixedTierFromOfferType(value.offer_type) };
  }
  if (kind === "percent_discount" || kind === "dollar_discount") {
    const existing = parseDiscountOffer(value.offer_type);
    const amount =
      existing?.kind === kind ? existing.amount : kind === "percent_discount" ? 10 : 10;
    return { offer_type: composeDiscountOffer(kind, amount) };
  }
  const leavingDiscount = isDiscountOffer(value.offer_type);
  return {
    offer_type: kind,
    ...(leavingDiscount && value.menu_item_id === ANY_MENU_ITEM ? { menu_item_id: "" } : {}),
  };
}

export function ReturnVoucherPresetCard({
  index,
  value,
  menuItems,
  onChange,
  onRemove,
  canRemove,
  disabled,
}: Props) {
  const menu = resolveMenu(value, menuItems);
  const tempOpts = menu ? allowedTemperatureRules(menu) : [];
  const fulfillOpts = menu ? allowedFulfillmentRules(menu) : [];
  const patch = (p: Partial<ReturnVoucherPresetDraft>) => onChange({ ...value, ...p });
  const offerKindValue = offerKindOf(value.offer_type);
  const discount = parseDiscountOffer(value.offer_type);
  const allowAnyItem = isDiscountOffer(value.offer_type);
  const dollarMax = discount?.kind === "dollar_discount" ? maxDollarDiscountForPrice(menu?.base_price) : null;

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
          onValueChange={(kind) => patch(handleOfferKindChange(value, kind as OfferKind))}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="b1g1">Buy 1 get 1</SelectItem>
            <SelectItem value="fixed">Fixed price</SelectItem>
            <SelectItem value="percent_discount">% discount</SelectItem>
            <SelectItem value="dollar_discount">$ discount</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {offerKindValue === "fixed" && (
        <div className="grid gap-2">
          <Label>Fixed price</Label>
          <Select
            value={fixedTierFromOfferType(value.offer_type)}
            onValueChange={(tier) => patch({ offer_type: tier })}
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
      {discount && (
        <div className="grid gap-2">
          <Label>{discount.kind === "percent_discount" ? "Discount (%)" : "Discount ($)"}</Label>
          <Input
            type="number"
            min={1}
            max={discount.kind === "percent_discount" ? 99 : dollarMax ?? undefined}
            value={discount.amount}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              patch({
                offer_type: composeDiscountOffer(discount.kind as DiscountOfferKind, n),
              });
            }}
            disabled={disabled}
          />
          {discount.kind === "dollar_discount" && menu && dollarMax != null && (
            <p className="text-xs text-muted-foreground">
              Max ${dollarMax} for this item (price ${Number(menu.base_price).toFixed(0)})
            </p>
          )}
        </div>
      )}
      <div className="grid gap-2">
        <Label>Menu item</Label>
        <MenuItemPicker
          items={menuItems}
          value={value.menu_item_id}
          allowAnyItem={allowAnyItem}
          onChange={(menu_item_id) => {
            if (menu_item_id === ANY_MENU_ITEM) {
              patch({
                menu_item_id,
                temperature_rule: "all_supported",
                fulfillment_rule: "all_supported",
              });
              return;
            }
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
