import type { ReactNode } from "react";
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
  isFixedOfferType,
  offerKindOf,
  parseDiscountOffer,
  type DiscountOfferKind,
  type OfferKind,
} from "@/lib/voucherOfferType";
import {
  isFixedPeriodEnded,
  joinPeriodBound,
  splitPeriodBound,
  type ReturnVoucherRedemptionMode,
} from "@/lib/returnVoucherPeriod";
import { Trash2 } from "lucide-react";

export type VoucherDraft = {
  clientKey: string;
  id?: string;
  menu_item_id: string;
  menu_item_ids: string[];
  custom_item_text: string;
  offer_type: string;
  redemption_mode: ReturnVoucherRedemptionMode;
  redeem_valid_days: number;
  redeem_starts_at: string;
  redeem_ends_at: string;
  quantity: number;
  temperature_rule: string;
  fulfillment_rule: string;
  sort_order: number;
};

type Props<T extends VoucherDraft> = {
  index: number;
  value: T;
  menuItems: MenuItemRow[];
  onChange: (next: T) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
  heading?: string;
  titleSlot?: ReactNode;
  blockB1g1CustomText?: boolean;
};

function handleOfferKindChange(
  value: VoucherDraft,
  kind: OfferKind,
): Partial<VoucherDraft> {
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

function FixedPeriodFields({
  clientKey,
  startsAt,
  endsAt,
  onStartsAt,
  onEndsAt,
  disabled,
}: {
  clientKey: string;
  startsAt: string;
  endsAt: string;
  onStartsAt: (next: string) => void;
  onEndsAt: (next: string) => void;
  disabled?: boolean;
}) {
  const start = splitPeriodBound(startsAt);
  const end = splitPeriodBound(endsAt);

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor={`redeem-starts-date-${clientKey}`}>Start date</Label>
          <Input
            id={`redeem-starts-date-${clientKey}`}
            type="date"
            value={start.date}
            onChange={(e) => onStartsAt(joinPeriodBound(e.target.value, start.time))}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`redeem-ends-date-${clientKey}`}>End date</Label>
          <Input
            id={`redeem-ends-date-${clientKey}`}
            type="date"
            value={end.date}
            onChange={(e) => onEndsAt(joinPeriodBound(e.target.value, end.time))}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor={`redeem-starts-time-${clientKey}`}>Start time (optional)</Label>
          <Input
            id={`redeem-starts-time-${clientKey}`}
            type="time"
            value={start.time}
            onChange={(e) => onStartsAt(joinPeriodBound(start.date, e.target.value))}
            disabled={disabled}
          />
          {start.time ? (
            <button
              type="button"
              className="justify-self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => onStartsAt(joinPeriodBound(start.date, ""))}
              disabled={disabled}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`redeem-ends-time-${clientKey}`}>End time (optional)</Label>
          <Input
            id={`redeem-ends-time-${clientKey}`}
            type="time"
            value={end.time}
            onChange={(e) => onEndsAt(joinPeriodBound(end.date, e.target.value))}
            disabled={disabled}
          />
          {end.time ? (
            <button
              type="button"
              className="justify-self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => onEndsAt(joinPeriodBound(end.date, ""))}
              disabled={disabled}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
      {isFixedPeriodEnded(endsAt) ? (
        <p className="text-xs text-muted-foreground">
          This period has already ended — no vouchers will be issued.
        </p>
      ) : null}
    </div>
  );
}

export function newVoucherDraft(sort: number): VoucherDraft {
  return {
    clientKey: crypto.randomUUID(),
    ...emptyVoucherItemDraft(),
    offer_type: "free",
    redemption_mode: "days_after_claim",
    redeem_valid_days: 7,
    redeem_starts_at: "",
    redeem_ends_at: "",
    quantity: 10,
    temperature_rule: "all_supported",
    fulfillment_rule: "all_supported",
    sort_order: sort,
  };
}

export function VoucherDefinitionCard<T extends VoucherDraft>({
  index,
  value,
  menuItems,
  onChange,
  onRemove,
  canRemove,
  disabled,
  heading = "Voucher",
  titleSlot,
  blockB1g1CustomText,
}: Props<T>) {
  const { tempOpts, fulfillOpts, rulesEnabled } = resolveVoucherItemRules(value, menuItems);
  const patch = (p: Partial<VoucherDraft>) => onChange({ ...value, ...p });

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
        <span className="text-sm font-medium">{heading} {index + 1}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {titleSlot}
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
          <p className="text-xs text-muted-foreground">Any menu item</p>
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
        blockB1g1CustomText={blockB1g1CustomText}
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
        <FixedPeriodFields
          clientKey={value.clientKey}
          startsAt={value.redeem_starts_at}
          endsAt={value.redeem_ends_at}
          onStartsAt={(redeem_starts_at) => patch({ redeem_starts_at })}
          onEndsAt={(redeem_ends_at) => patch({ redeem_ends_at })}
          disabled={disabled}
        />
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

export { isFixedOfferType, fixedTierFromOfferType, FIXED_PRICE_TIERS } from "@/lib/voucherOfferType";
