import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MenuItemPicker } from "@/components/campaigns/vouchers/MenuItemPicker";
import { MenuItemMultiSelect } from "@/components/campaigns/vouchers/MenuItemMultiSelect";
import type { MenuItemRow } from "@/hooks/useOrgMenuItems";
import {
  allowedFulfillmentRules,
  allowedTemperatureRules,
} from "@/components/campaigns/vouchers/voucherRules";
import {
  CUSTOM_ITEM_TEXT_MAX,
  CUSTOM_MENU_TEXT,
  MULTI_MENU_ITEMS,
  isDiscountOffer,
  isMenuItemSentinel,
} from "@/lib/voucherOfferType";
import { menuItemModePatch, type VoucherItemDraft } from "@/lib/voucherItemDraft";

type Value = VoucherItemDraft & {
  offer_type: string;
  temperature_rule: string;
  fulfillment_rule: string;
};

type Props = {
  value: Value;
  menuItems: MenuItemRow[];
  onChange: (patch: Partial<Value>) => void;
  disabled?: boolean;
  blockB1g1CustomText?: boolean;
};

export function VoucherItemScopeFields({
  value,
  menuItems,
  onChange,
  disabled,
  blockB1g1CustomText,
}: Props) {
  const allowAnyItem = isDiscountOffer(value.offer_type);
  const showB1g1CustomWarning =
    blockB1g1CustomText && value.offer_type === "b1g1" && value.menu_item_id === CUSTOM_MENU_TEXT;

  return (
    <>
      <div className="grid gap-2">
        <Label>Menu item</Label>
        <MenuItemPicker
          items={menuItems}
          value={value.menu_item_id}
          allowAnyItem={allowAnyItem}
          onChange={(menu_item_id) => {
            const modePatch = menuItemModePatch(menu_item_id, value);
            if (isMenuItemSentinel(menu_item_id)) {
              onChange(modePatch);
              return;
            }
            const menu = menuItems.find((item) => item.id === menu_item_id);
            onChange({
              ...modePatch,
              temperature_rule: menu ? allowedTemperatureRules(menu)[0] : "n_a",
              fulfillment_rule: menu ? allowedFulfillmentRules(menu)[0] : "all_supported",
            });
          }}
          disabled={disabled}
        />
      </div>
      {value.menu_item_id === MULTI_MENU_ITEMS && (
        <MenuItemMultiSelect
          items={menuItems}
          value={value.menu_item_ids}
          onChange={(menu_item_ids) => onChange({ menu_item_ids })}
          disabled={disabled}
        />
      )}
      {value.menu_item_id === CUSTOM_MENU_TEXT && (
        <div className="grid gap-2">
          <Label>Custom text</Label>
          <Input
            value={value.custom_item_text}
            onChange={(e) => onChange({ custom_item_text: e.target.value })}
            disabled={disabled}
            maxLength={CUSTOM_ITEM_TEXT_MAX}
            placeholder="e.g. all black coffee"
          />
        </div>
      )}
      {showB1g1CustomWarning && (
        <p className="text-xs text-destructive">
          Buy 1 get 1 campaigns cannot use custom text. Pick a menu item or multi item.
        </p>
      )}
    </>
  );
}
