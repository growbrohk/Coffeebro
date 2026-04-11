import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  startAt: string;
  endAt: string;
  onStartAt: (v: string) => void;
  onEndAt: (v: string) => void;
  disabled?: boolean;
};

/** Convert ISO or datetime-local to value for `<input type="datetime-local">` */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function CampaignScheduleSection({ startAt, endAt, onStartAt, onEndAt, disabled }: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Schedule</h2>
      <p className="text-sm text-muted-foreground">Required before publishing.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="start-at">Start</Label>
          <Input
            id="start-at"
            type="datetime-local"
            value={startAt}
            onChange={(e) => onStartAt(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end-at">End</Label>
          <Input
            id="end-at"
            type="datetime-local"
            value={endAt}
            onChange={(e) => onEndAt(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </section>
  );
}
