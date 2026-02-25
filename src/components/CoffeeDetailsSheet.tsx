import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { CoffeeTypeSelect } from '@/components/CoffeeTypeSelect';

export interface CoffeeDetails {
  rating: number | null;
  coffee_type: string | null;
  coffee_type_other: string;
  place: string;
  diary: string;
}

interface CoffeeDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (details: CoffeeDetails) => void;
  isPending?: boolean;
}

export function CoffeeDetailsSheet({ open, onOpenChange, onSave, isPending }: CoffeeDetailsSheetProps) {
  const [rating, setRating] = useState<number>(5);
  const [ratingSet, setRatingSet] = useState(false);
  const [coffeeType, setCoffeeType] = useState<string | null>(null);
  const [coffeeTypeOther, setCoffeeTypeOther] = useState<string>('');
  const [place, setPlace] = useState<string>('');
  const [diary, setDiary] = useState<string>('');

  const handleSave = () => {
    const details: CoffeeDetails = {
      rating: ratingSet ? rating : null,
      coffee_type: coffeeType,
      coffee_type_other: coffeeTypeOther,
      place,
      diary,
    };
    onSave(details);
  };

  const handleSkip = () => {
    onSave({
      rating: null,
      coffee_type: null,
      coffee_type_other: '',
      place: '',
      diary: '',
    });
  };

  const resetForm = () => {
    setRating(5);
    setRatingSet(false);
    setCoffeeType(null);
    setCoffeeTypeOther('');
    setPlace('');
    setDiary('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleCoffeeTypeChange = (value: string[]) => {
    const selected = value[0] ?? null;
    setCoffeeType(selected);
    if (selected !== 'Other') setCoffeeTypeOther('');
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="bottom" 
        className="bg-background border-t border-border rounded-t-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="text-xl font-black uppercase tracking-tight">
            Nice Coffee! ☕
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Optional: Tell us about your coffee
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">
              How was your coffee?
            </Label>
            <p className="text-xs text-muted-foreground">
              1 = terrible, 10 = heavenly
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium w-4">1</span>
              <Slider
                value={[rating]}
                onValueChange={(value) => {
                  setRating(value[0]);
                  setRatingSet(true);
                }}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-medium w-4">10</span>
            </div>
            {ratingSet && (
              <div className="text-center">
                <span className="text-lg font-bold">{rating}</span>
              </div>
            )}
          </div>

          {/* Coffee Type - reuses shared CoffeeTypeSelect (single selection) */}
          <CoffeeTypeSelect
            value={coffeeType ? [coffeeType] : []}
            onChange={handleCoffeeTypeChange}
            maxSelected={1}
            label="What coffee did you have?!"
          />
          {coffeeType === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="coffee-type-other" className="text-sm font-semibold">
                Specify (optional)
              </Label>
              <Input
                id="coffee-type-other"
                placeholder="e.g. Custom blend name"
                value={coffeeTypeOther}
                onChange={(e) => setCoffeeTypeOther(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          )}

          {/* Place */}
          <div className="space-y-2">
            <Label htmlFor="place" className="text-sm font-semibold">
              Where did you drink it?!
            </Label>
            <Input
              id="place"
              placeholder="e.g. Kokoni / Home / Office"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="bg-background border-border"
              autoFocus={false}
            />
          </div>

          {/* Diary */}
          <div className="space-y-2">
            <Label htmlFor="diary" className="text-sm font-semibold">
              Coffee Diary (optional)
            </Label>
            <Textarea
              id="diary"
              placeholder="Notes about taste, vibe, who you were with..."
              value={diary}
              onChange={(e) => setDiary(e.target.value)}
              className="bg-background border-border min-h-[100px]"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-8">
          <Button
            variant="outline"
            className="flex-1 h-12 font-semibold"
            onClick={handleSkip}
            disabled={isPending}
          >
            Skip
          </Button>
          <Button
            className="flex-1 h-12 font-semibold"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
