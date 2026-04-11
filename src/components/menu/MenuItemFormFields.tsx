import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TablesInsert } from "@/integrations/supabase/types";

export type MenuItemFormValues = Pick<
  TablesInsert<"menu_items">,
  "item_name" | "category" | "base_price" | "temperature_option" | "fulfillment_option" | "status"
>;

type Props = {
  value: MenuItemFormValues;
  onChange: (next: MenuItemFormValues) => void;
  disabled?: boolean;
};

const CATEGORIES = [
  { value: "coffee", label: "Coffee" },
  { value: "non_coffee_drinks", label: "Non-coffee drinks" },
  { value: "pastry", label: "Pastry" },
  { value: "dessert", label: "Dessert" },
  { value: "food", label: "Food" },
] as const;

const TEMPS = [
  { value: "hot", label: "Hot only" },
  { value: "iced", label: "Iced only" },
  { value: "both", label: "Hot & iced" },
  { value: "n_a", label: "N/A" },
] as const;

const FULFILL = [
  { value: "dine_in", label: "Dine-in" },
  { value: "takeaway", label: "Takeaway" },
  { value: "both", label: "Both" },
] as const;

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "hidden", label: "Hidden" },
] as const;

export function MenuItemFormFields({ value, onChange, disabled }: Props) {
  const patch = (p: Partial<MenuItemFormValues>) => onChange({ ...value, ...p });

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="mi-name">Item name</Label>
        <Input
          id="mi-name"
          value={value.item_name}
          onChange={(e) => patch({ item_name: e.target.value })}
          disabled={disabled}
          placeholder="e.g. Flat white"
        />
      </div>
      <div className="grid gap-2">
        <Label>Category</Label>
        <Select
          value={value.category}
          onValueChange={(category) => patch({ category: category as MenuItemFormValues["category"] })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mi-price">Base price (HKD)</Label>
        <Input
          id="mi-price"
          type="number"
          step="0.01"
          min={0}
          value={value.base_price}
          onChange={(e) => patch({ base_price: Number(e.target.value) })}
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label>Temperature</Label>
        <Select
          value={value.temperature_option}
          onValueChange={(temperature_option) =>
            patch({ temperature_option: temperature_option as MenuItemFormValues["temperature_option"] })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Fulfillment</Label>
        <Select
          value={value.fulfillment_option}
          onValueChange={(fulfillment_option) =>
            patch({ fulfillment_option: fulfillment_option as MenuItemFormValues["fulfillment_option"] })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FULFILL.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Status</Label>
        <Select
          value={value.status}
          onValueChange={(status) => patch({ status: status as MenuItemFormValues["status"] })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function emptyMenuItemForm(orgId: string): MenuItemFormValues & { org_id: string } {
  return {
    org_id: orgId,
    item_name: "",
    category: "coffee",
    base_price: 0,
    temperature_option: "both",
    fulfillment_option: "both",
    status: "active",
  };
}
