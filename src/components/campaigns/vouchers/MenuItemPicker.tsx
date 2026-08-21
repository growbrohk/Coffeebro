import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MenuItemRow } from "@/hooks/useOrgMenuItems";
import { ANY_MENU_ITEM } from "@/lib/voucherOfferType";

type Props = {
  items: MenuItemRow[];
  value: string;
  onChange: (menuItemId: string) => void;
  disabled?: boolean;
  allowAnyItem?: boolean;
};

export function MenuItemPicker({ items, value, onChange, disabled, allowAnyItem }: Props) {
  const selectValue = value || undefined;

  return (
    <Select
      value={selectValue}
      onValueChange={onChange}
      disabled={disabled || (items.length === 0 && !allowAnyItem)}
    >
      <SelectTrigger>
        <SelectValue placeholder={items.length || allowAnyItem ? "Select menu item" : "Add menu items first"} />
      </SelectTrigger>
      <SelectContent>
        {allowAnyItem && <SelectItem value={ANY_MENU_ITEM}>Any item</SelectItem>}
        {items.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.item_name} · {m.category} · ${Number(m.base_price).toFixed(0)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { ANY_MENU_ITEM };
