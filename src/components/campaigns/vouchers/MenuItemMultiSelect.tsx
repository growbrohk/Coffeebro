import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItemRow } from "@/hooks/useOrgMenuItems";

type Props = {
  items: MenuItemRow[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function MenuItemMultiSelect({ items, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const labelById = new Map(
    items.map((item) => [
      item.id,
      `${item.item_name} · ${item.category} · $${Number(item.base_price).toFixed(0)}`,
    ]),
  );

  const filtered = items.filter((item) => {
    const label = labelById.get(item.id) ?? item.item_name;
    return label.toLowerCase().includes(searchValue.toLowerCase());
  });

  const handleSelect = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((existing) => existing !== id));
    } else {
      onChange([...value, id]);
    }
    setSearchValue("");
  };

  const displayValue =
    value.length === 0
      ? items.length
        ? "Select menu items"
        : "Add menu items first"
      : value.length === 1
        ? (labelById.get(value[0]) ?? "1 selected")
        : `${value.length} selected`;

  return (
    <div className="grid gap-2">
      <Label>Items</Label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => {
            const label = labelById.get(id) ?? id;
            return (
              <div
                key={id}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-sm text-primary"
              >
                <span>{items.find((item) => item.id === id)?.item_name ?? id}</span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((existing) => existing !== id))}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                  aria-label={`Remove ${label}`}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || items.length === 0}
            className="h-10 w-full justify-between bg-background font-normal"
          >
            <span className="truncate">{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search menu items…"
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                {filtered.map((item) => {
                  const isSelected = value.includes(item.id);
                  return (
                    <CommandItem
                      key={item.id}
                      value={labelById.get(item.id)}
                      onSelect={() => handleSelect(item.id)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                      {labelById.get(item.id)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
