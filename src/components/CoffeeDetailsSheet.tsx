import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { CoffeeTypeSelect } from '@/components/CoffeeTypeSelect';
import { CoffeeCupIcon, COFFEE_CUP_FILL_1 } from '@/components/CoffeeCupMark';

export interface CoffeeDetails {
  rating: number | null;
  coffee_type: string | null;
  coffee_type_other: string;
  place: string;
  diary: string;
  beans: string;
  note: string;
}

interface CoffeeDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (details: CoffeeDetails) => void;
  isPending?: boolean;
}

const inputOnOrange =
  'h-12 rounded-full border-0 bg-white text-foreground placeholder:text-muted-foreground shadow-none focus-visible:ring-2 focus-visible:ring-white/80';

const textareaOnOrange =
  'min-h-[120px] rounded-[1.25rem] border-0 bg-white text-foreground placeholder:text-muted-foreground shadow-none focus-visible:ring-2 focus-visible:ring-white/80';

export function CoffeeDetailsSheet({ open, onOpenChange, onSave, isPending }: CoffeeDetailsSheetProps) {
  const [rating, setRating] = useState<number>(5);
  const [ratingSet, setRatingSet] = useState(false);
  const [coffeeType, setCoffeeType] = useState<string | null>(null);
  const [coffeeTypeOther, setCoffeeTypeOther] = useState<string>('');
  const [place, setPlace] = useState<string>('');
  const [diary, setDiary] = useState<string>('');
  const [beans, setBeans] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const handleSave = () => {
    const details: CoffeeDetails = {
      rating: ratingSet ? rating : null,
      coffee_type: coffeeType,
      coffee_type_other: coffeeTypeOther,
      place,
      diary,
      beans,
      note,
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
      beans: '',
      note: '',
    });
  };

  const resetForm = () => {
    setRating(5);
    setRatingSet(false);
    setCoffeeType(null);
    setCoffeeTypeOther('');
    setPlace('');
    setDiary('');
    setBeans('');
    setNote('');
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

  const labelOrange = 'text-sm font-bold text-primary-foreground';

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[95dvh] flex-col overflow-hidden rounded-t-3xl border-0 bg-transparent p-0 [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex max-h-[95dvh] flex-col overflow-y-auto">
          <div className="relative bg-[hsl(40,43%,98%)] px-4 pb-4 pt-3">
            <button
              type="button"
              className="absolute left-3 top-3 rounded-full p-2 text-foreground hover:bg-black/5"
              onClick={() => handleOpenChange(false)}
              aria-label="Back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <p className="text-center text-sm font-medium lowercase text-muted-foreground">log a coffee</p>
            <div className="mt-2 flex justify-center">
              <CoffeeCupIcon fill={COFFEE_CUP_FILL_1} className="h-[88px] w-[88px]" />
            </div>
            <h2 className="mt-1 px-2 text-center text-2xl font-bold lowercase leading-tight text-foreground">
              what coffee did you drink today?
            </h2>
          </div>

          <div className="flex flex-1 flex-col rounded-t-3xl bg-primary px-4 pb-8 pt-6 -mt-2">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className={labelOrange}>How was your coffee?</Label>
                <p className="text-xs font-medium text-primary-foreground/90">1 = terrible, 10 = heavenly</p>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-sm font-bold text-primary-foreground">1</span>
                  <Slider
                    value={[rating]}
                    onValueChange={(value) => {
                      setRating(value[0]);
                      setRatingSet(true);
                    }}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1 [&>span:first-child]:bg-black/20 [&>span:first-child>span]:bg-white"
                    thumbClassName="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-transparent p-0 shadow-none ring-offset-primary focus-visible:ring-white/70"
                    thumbChild={<CoffeeCupIcon className="h-5 w-5" fill="#ffffff" />}
                  />
                  <span className="text-sm font-bold text-primary-foreground">10</span>
                </div>
              </div>

              <CoffeeTypeSelect
                value={coffeeType ? [coffeeType] : []}
                onChange={handleCoffeeTypeChange}
                maxSelected={1}
                label="What coffee did you have?"
                labelClassName={labelOrange}
                triggerClassName={inputOnOrange}
                emptyLabel="Search coffee..."
                searchPlaceholder="Search coffee..."
              />
              {coffeeType === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="coffee-type-other" className={labelOrange}>
                    Specify (optional)
                  </Label>
                  <Input
                    id="coffee-type-other"
                    placeholder="e.g. Custom blend name"
                    value={coffeeTypeOther}
                    onChange={(e) => setCoffeeTypeOther(e.target.value)}
                    className={inputOnOrange}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="place" className={labelOrange}>
                  Where did you drink it?
                </Label>
                <Input
                  id="place"
                  placeholder="e.g. home/ office/ coffee shop..."
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  className={inputOnOrange}
                  autoFocus={false}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diary" className={labelOrange}>
                  Coffee diary
                </Label>
                <Textarea
                  id="diary"
                  placeholder="Notes about taste, vibe, who you were with..."
                  value={diary}
                  onChange={(e) => setDiary(e.target.value)}
                  className={textareaOnOrange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="beans" className={labelOrange}>
                  What beans was used?
                </Label>
                <Input
                  id="beans"
                  placeholder="e.g. ethiopia"
                  value={beans}
                  onChange={(e) => setBeans(e.target.value)}
                  className={inputOnOrange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note" className={labelOrange}>
                  Notes
                </Label>
                <Input
                  id="note"
                  placeholder="e.g. notes to take down on this coffee"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={inputOnOrange}
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 border-2 border-primary-foreground bg-transparent font-semibold text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={handleSkip}
                disabled={isPending}
              >
                Skip
              </Button>
              <Button
                type="button"
                className="h-12 flex-1 bg-primary-foreground font-semibold text-primary hover:bg-primary-foreground/90"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
