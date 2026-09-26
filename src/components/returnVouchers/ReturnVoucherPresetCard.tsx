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
import { VoucherItemScopeFields } from "@/components/campaigns/vouchers/VoucherItemScopeFields";
import type { MenuItemRow } from "@/hooks/useOrgMenuItems";
import { dollarMaxForDraft, emptyVoucherItemDraft, resolveVoucherItemRules } from "@/lib/voucherItemDraft";
import {
  ANY_MENU_ITEM,
  composeDiscountOffer,
  fixedTierFromOfferType,
  isDiscountOffer,
  offerKindOf,
  parseDiscountOffer,
  type DiscountOfferKind,
  type OfferKind,
} from "@/lib/voucherOfferType";
import { isFixedPeriodEnded, type ReturnVoucherRedemptionMode } from "@/lib/returnVoucherPeriod";
import { Trash2 } from "lucide-react";

export type ReturnVoucherPresetDraft = {
  clientKey: string;
  id?: string;
  title: string;
  menu_item_id: string;
  menu_item_ids: string[];
  custom_item_text: string;
  offer_type: string;
  redemption_mode: ReturnVoucherRedemptionMode;
  redeem_valid_days: number;
  redeem_starts_on: string;
  redeem_ends_on: string;
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
  const { tempOpts, fulfillOpts, rulesEnabled } = resolveVoucherItemRules(value, menuItems);
  const patch = (p: Partial<ReturnVoucherPresetDraft>) => onChange({ ...value, ...p });
  const offerKindValue = offerKindOf(value.offer_type);
  const discount = parseDiscountOffer(value.offer_type);
  const dollarMax = discount?.kind === "dollar_discount" ? dollarMaxForDraft(value, menuItems) : null;
  const cheapest = dollarMax != null
    ? Math.min(...menuItems.filter((m) => {
        if (value.menu_item_id === m.id) return true;
        return value.menu_item_ids.includes(m.id);
      }).map((m) => Number(m.base_price)))
    : null;

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
          {discount.kind === "dollar_discount" && dollarMax != null && cheapest != null && (
            <p className="text-xs text-muted-foreground">
              Max ${dollarMax} for this item (price ${cheapest.toFixed(0)})
            </p>
          )}
        </div>
      )}
      <VoucherItemScopeFields
        value={value}
        menuItems={menuItems}
        onChange={patch}
        disabled={disabled}
      />
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
        <Label>Redemption Period</Label>
        <Select
          value={value.redemption_mode}
          onValueChange={(mode) => patch({ redemption_mode: mode as ReturnVoucherRedemptionMode })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="days_after_claim">Valid days after claim</SelectItem>
            <SelectItem value="fixed_period">Fixed Period</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.redemption_mode === "days_after_claim" ? (
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
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            <Label htmlFor={`redeem-starts-${value.clientKey}`}>Start date</Label>
            <Input
              id={`redeem-starts-${value.clientKey}`}
              type="date"
              value={value.redeem_starts_on}
              onChange={(e) => patch({ redeem_starts_on: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`redeem-ends-${value.clientKey}`}>End date</Label>
            <Input
              id={`redeem-ends-${value.clientKey}`}
              type="date"
              value={value.redeem_ends_on}
              onChange={(e) => patch({ redeem_ends_on: e.target.value })}
              disabled={disabled}
            />
          </div>
          {isFixedPeriodEnded(value.redeem_ends_on) ? (
            <p className="col-span-2 text-xs text-muted-foreground">
              This period has already ended — no vouchers will be issued.
            </p>
          ) : null}
        </div>
      )}
      <div className="grid gap-2">
        <Label>Temperature rule</Label>
        <Select
          value={value.temperature_rule}
          onValueChange={(temperature_rule) => patch({ temperature_rule })}
          disabled={disabled || !rulesEnabled}
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
          disabled={disabled || !rulesEnabled}
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
    ...emptyVoucherItemDraft(),
    offer_type: "free",
    redemption_mode: "days_after_claim",
    redeem_valid_days: 7,
    redeem_starts_on: "",
    redeem_ends_on: "",
    quantity: 10,
    temperature_rule: "all_supported",
    fulfillment_rule: "all_supported",
    sort_order: sort,
  };
}
