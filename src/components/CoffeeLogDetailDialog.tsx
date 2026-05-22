import type { ReactNode } from 'react';
import { Ticket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { drinkLabelFromDailyCoffee } from '@/hooks/useCoffees';
import { formatHkd, formatReceiptItemsSummary, parseReceiptLineItems } from '@/lib/receiptDisplay';
import type { Database } from '@/integrations/supabase/types';

type DailyCoffeeRow = Database['public']['Tables']['daily_coffees']['Row'];

function logTypeLabel(logType: string): string {
  if (logType === 'voucher') return 'Voucher';
  if (logType === 'receipt') return 'Receipt';
  return 'Normal';
}

function locationKindLabel(kind: string | null): string | null {
  if (kind === 'home') return 'Home';
  if (kind === 'coffee_shop') return 'Coffee shop';
  if (kind === 'other') return 'Other';
  return null;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <span className="font-semibold text-muted-foreground">{label}: </span>
      <span className="text-foreground">{children}</span>
    </p>
  );
}

function ReceiptLineItems({ items }: { items: unknown }) {
  const parsed = parseReceiptLineItems(items);
  if (parsed.length === 0) return null;
  return (
    <ul className="mt-1 space-y-1">
      {parsed.map((li, i) => {
        const unitPrice =
          li.unit_price_cents != null ? formatHkd(li.unit_price_cents) : '';
        return (
          <li key={i} className="flex justify-between gap-2 border-b border-border/60 py-1 last:border-0">
            <span className="min-w-0 flex-1">{li.name ?? 'Item'}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {li.qty != null ? `×${li.qty} ` : ''}
              {unitPrice}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CoffeeLogDetailBody({ entry }: { entry: DailyCoffeeRow }) {
  const isReceipt = entry.log_type === 'receipt';
  const title = isReceipt
    ? formatReceiptItemsSummary(entry.receipt_line_items) || 'Receipt'
    : drinkLabelFromDailyCoffee(entry);
  const time = new Date(entry.created_at).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const date = new Date(`${entry.coffee_date}T12:00:00`).toLocaleDateString(undefined, {
    dateStyle: 'full',
  });
  const place = entry.place?.trim();
  const tastingNotes = entry.tasting_notes?.trim();
  const locationLabel = locationKindLabel(entry.location_kind);
  const receiptTotal =
    entry.receipt_amount_cents != null ? formatHkd(entry.receipt_amount_cents) : '';

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-1.5 text-left text-lg font-bold">
          {entry.log_type === 'voucher' ? (
            <Ticket className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          ) : null}
          {title}
        </DialogTitle>
        <DialogDescription className="sr-only">Coffee log details</DialogDescription>
      </DialogHeader>

      <div className="space-y-2 text-xs text-foreground">
        <DetailRow label="Time">{time}</DetailRow>
        <DetailRow label="Date">{date}</DetailRow>
        {place ? <DetailRow label="Place">{place}</DetailRow> : null}
        {tastingNotes ? (
          <div>
            <p className="font-semibold text-muted-foreground">Tasting notes:</p>
            <p className="mt-0.5 whitespace-pre-wrap leading-relaxed text-foreground">{tastingNotes}</p>
          </div>
        ) : null}
        <DetailRow label="Type">{logTypeLabel(entry.log_type)}</DetailRow>
        {locationLabel ? <DetailRow label="Location">{locationLabel}</DetailRow> : null}
        <DetailRow label="Shared">{entry.share_publicly ? 'Yes' : 'No'}</DetailRow>
        {isReceipt && receiptTotal ? (
          <DetailRow label="Receipt total">{receiptTotal}</DetailRow>
        ) : null}
        {isReceipt && entry.receipt_line_items ? (
          <div>
            <p className="font-semibold text-muted-foreground">Receipt items:</p>
            <ReceiptLineItems items={entry.receipt_line_items} />
          </div>
        ) : null}
      </div>
    </>
  );
}

export interface CoffeeLogDetailDialogProps {
  entry: DailyCoffeeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoffeeLogDetailDialog({ entry, open, onOpenChange }: CoffeeLogDetailDialogProps) {
  return (
    <Dialog open={open && entry != null} onOpenChange={onOpenChange}>
      {entry ? (
        <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto rounded-2xl border-0 shadow-soft">
          <CoffeeLogDetailBody entry={entry} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
