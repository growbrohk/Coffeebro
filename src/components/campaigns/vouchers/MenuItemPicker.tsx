import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MenuItemRow } from "@/hooks/useOrgMenuItems";

type Props = {
  items: MenuItemRow[];
  value: string;
  onChange: (menuItemId: string) => void;
  disabled?: boolean;
};

export function MenuItemPicker({ items, value, onChange, disabled }: Props) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled || items.length === 0}>
      <SelectTrigger>
        <SelectValue placeholder={items.length ? "Select menu item" : "Add menu items first"} />
      </SelectTrigger>
      <SelectContent>
        {items.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.item_name} · {m.category} · ${Number(m.base_price).toFixed(0)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
