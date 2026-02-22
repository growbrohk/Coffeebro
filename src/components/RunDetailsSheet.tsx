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

export type RunType = 'easy' | 'tempo' | 'long_slow_distance' | 'interval';

export interface RunDetails {
  duration_minutes: number | null;
  run_type: RunType | null;
  tiredness_score: number | null;
}

interface RunDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (details: RunDetails) => void;
  isPending?: boolean;
}

const runTypeOptions: { value: RunType; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'long_slow_distance', label: 'Long Slow Distance' },
  { value: 'interval', label: 'Interval' },
];

export function RunDetailsSheet({ open, onOpenChange, onSave, isPending }: RunDetailsSheetProps) {
  const [duration, setDuration] = useState<string>('');
  const [runType, setRunType] = useState<RunType | null>(null);
  const [tiredness, setTiredness] = useState<number>(5);
  const [tirednessSet, setTirednessSet] = useState(false);

  const handleSave = () => {
    const details: RunDetails = {
      duration_minutes: duration ? parseInt(duration, 10) : null,
      run_type: runType,
      tiredness_score: tirednessSet ? tiredness : null,
    };
    onSave(details);
  };

  const handleSkip = () => {
    onSave({
      duration_minutes: null,
      run_type: null,
      tiredness_score: null,
    });
  };

  const resetForm = () => {
    setDuration('');
    setRunType(null);
    setTiredness(5);
    setTirednessSet(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
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
            Nice Run! 🏃
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Optional: Tell us about your run
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sm font-semibold">
              How long did you run today? (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              placeholder="e.g. 30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-background border-border"
              autoFocus={false}
            />
          </div>

          {/* Run Type */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              What run did you do today?
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {runTypeOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={runType === option.value ? 'default' : 'outline'}
                  className={`h-10 text-sm font-semibold ${
                    runType === option.value 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-background border-border'
                  }`}
                  onClick={() => setRunType(runType === option.value ? null : option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tiredness Score */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">
              How tired does your body feel now?
            </Label>
            <p className="text-xs text-muted-foreground">
              1 = super tired, 10 = not tired at all
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium w-4">1</span>
              <Slider
                value={[tiredness]}
                onValueChange={(value) => {
                  setTiredness(value[0]);
                  setTirednessSet(true);
                }}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-medium w-4">10</span>
            </div>
            {tirednessSet && (
              <div className="text-center">
                <span className="text-lg font-bold">{tiredness}</span>
              </div>
            )}
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
