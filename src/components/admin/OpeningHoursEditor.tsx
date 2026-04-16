import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  OPENING_DAY_KEYS,
  OPENING_DAY_LABELS,
  type DayHours,
  type OpeningDayKey,
} from '@/lib/openingHours';

type Props = {
  value: Record<OpeningDayKey, DayHours>;
  onChange: (next: Record<OpeningDayKey, DayHours>) => void;
  disabled?: boolean;
};

export function OpeningHoursEditor({ value, onChange, disabled = false }: Props) {
  const patchDay = (key: OpeningDayKey, patch: Partial<DayHours>) => {
    onChange({
      ...value,
      [key]: { ...value[key], ...patch },
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      {OPENING_DAY_KEYS.map((key) => {
        const row = value[key];
        return (
          <div
            key={key}
            className="flex flex-col gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3"
          >
            <div className="flex w-full min-w-[7rem] items-center gap-2 sm:w-40">
              <Checkbox
                id={`day-open-${key}`}
                checked={!row.closed}
                disabled={disabled}
                onCheckedChange={(c) =>
                  patchDay(key, { closed: c !== true })
                }
                aria-label={`Open on ${OPENING_DAY_LABELS[key]}`}
              />
              <Label
                htmlFor={`day-open-${key}`}
                className="flex flex-col gap-0.5 leading-tight sm:flex-row sm:items-baseline sm:gap-1.5"
              >
                <span className="text-muted-foreground text-xs font-normal">Open</span>
                <span className="text-sm font-medium">{OPENING_DAY_LABELS[key]}</span>
              </Label>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Input
                type="time"
                disabled={disabled || row.closed}
                value={row.open}
                onChange={(e) => patchDay(key, { open: e.target.value })}
                className="h-9 w-[7.5rem]"
                aria-label={`${OPENING_DAY_LABELS[key]} opens`}
              />
              <span className="text-muted-foreground text-sm" aria-hidden>
                –
              </span>
              <Input
                type="time"
                disabled={disabled || row.closed}
                value={row.close}
                onChange={(e) => patchDay(key, { close: e.target.value })}
                className="h-9 w-[7.5rem]"
                aria-label={`${OPENING_DAY_LABELS[key]} closes`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
