import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const COFFEE_OPTIONS = [
  'Espresso',
  'Doppio',
  'Ristretto',
  'Lungo',
  'Americano',
  'Long Black',
  'Cappuccino',
  'Latte',
  'Flat White',
  'Piccolo',
  'Cortado',
  'Macchiato',
  'Mocha',
  'Affogato',
  'Café au lait',
  'Breve',
  'Vienna',
  'Irish Coffee',
  'Iced Americano',
  'Iced Latte',
  'Iced Cappuccino',
  'Iced Mocha',
  'Cold Brew',
  'Nitro Cold Brew',
  'Espresso Tonic',
  'Pour-over (V60)',
  'Chemex',
  'AeroPress',
  'French Press',
  'Moka Pot',
  'Siphon',
  'Turkish Coffee',
  'Instant Coffee',
  'Decaf',
  'Drip Coffee',
  'Filter Coffee',
  'Oat Latte',
  'Soy Latte',
  'Almond Latte',
  'Coconut Latte',
  'Dirty (espresso + milk)',
  'Latte with syrup (vanilla/caramel/hazelnut)',
  'Other',
];

interface CoffeeTypeSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  maxSelected?: number;
  label?: string;
  className?: string;
  onMaxReached?: () => void;
}

export function CoffeeTypeSelect({
  value,
  onChange,
  maxSelected = 2,
  label = 'Coffee type (choose up to 2)',
  className,
  onMaxReached,
}: CoffeeTypeSelectProps) {
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Filter coffee options based on search
  const filteredOptions = COFFEE_OPTIONS.filter((option) =>
    option.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (selectedValue: string) => {
    if (value.includes(selectedValue)) {
      // Deselect if already selected
      onChange(value.filter((v) => v !== selectedValue));
    } else {
      // Check if max selected
      if (value.length >= maxSelected) {
        if (onMaxReached) {
          onMaxReached();
        }
        return;
      }
      // Add to selection
      onChange([...value, selectedValue]);
    }
    setSearchValue('');
  };

  const handleRemove = (itemToRemove: string) => {
    onChange(value.filter((v) => v !== itemToRemove));
  };

  const displayValue = value.length === 0 
    ? 'Search coffee…' 
    : value.length === 1 
    ? value[0] 
    : `${value.length} selected`;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-sm font-semibold">{label}</Label>
      )}
      
      {/* Selected items display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((item) => (
            <div
              key={item}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="hover:bg-primary/20 rounded-full p-0.5"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Combobox */}
      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={comboboxOpen}
            className="w-full justify-between bg-background border-border"
            disabled={value.length >= maxSelected}
          >
            {displayValue}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search coffee…"
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No coffee found.</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => {
                  const isSelected = value.includes(option);
                  const isDisabled = !isSelected && value.length >= maxSelected;
                  
                  return (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => handleSelect(option)}
                      disabled={isDisabled}
                      className={cn(
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {option}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {value.length >= maxSelected && (
        <p className="text-xs text-muted-foreground">
          Maximum {maxSelected} coffee types selected
        </p>
      )}
    </div>
  );
}
