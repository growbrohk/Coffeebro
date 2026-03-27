import { Clock, ImageIcon, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OFFER_TYPE_LABELS } from '@/lib/offerTypes';
import type { CoffeeOffer, HuntOfferForCalendarRow, HuntOfferTreasureEmbed } from '@/hooks/useCoffeeOffers';
import { cn } from '@/lib/utils';

function truncate(str: string, maxLen: number) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

function formatClaimWindow(startsAt: string | null | undefined, endsAt: string | null | undefined): string | null {
  if (!startsAt && !endsAt) return null;
  const format = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  if (startsAt && endsAt) return `${format(startsAt)} – ${format(endsAt)}`;
  if (endsAt) return `Until ${format(endsAt)}`;
  if (startsAt) return `Opens ${format(startsAt)}`;
  return null;
}

function offerTypeLabel(offerType: string | null | undefined): string | null {
  if (!offerType) return null;
  return OFFER_TYPE_LABELS[offerType] ?? offerType;
}

/** Calendar `event_time` is stored as HH:MM or HH:MM:SS */
function formatCalendarStartTime(eventTime: string | null | undefined): string | null {
  if (!eventTime?.trim()) return null;
  const t = eventTime.trim();
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function CampaignTypeLine({
  campaignDisplay,
  typeLabel,
  className,
}: {
  campaignDisplay: string;
  typeLabel: string | null;
  className?: string;
}) {
  return (
    <p className={cn('text-sm font-semibold text-foreground truncate pr-20', className)}>
      <span className="text-foreground">{campaignDisplay}</span>
      {typeLabel && (
        <>
          <span className="text-muted-foreground font-normal"> · </span>
          <span className="text-muted-foreground font-normal">{typeLabel}</span>
        </>
      )}
    </p>
  );
}

type CalendarVoucherOfferCardProps =
  | {
      kind: 'calendar';
      offer: CoffeeOffer;
      onDetails: () => void;
    }
  | {
      kind: 'hunt';
      row: HuntOfferForCalendarRow;
      treasure: HuntOfferTreasureEmbed;
      onDetails: () => void;
    };

export function CalendarVoucherOfferCard(props: CalendarVoucherOfferCardProps) {
  if (props.kind === 'calendar') {
    const { offer, onDetails } = props;
    const typeLabel = offerTypeLabel(offer.offer_type);
    const campaignDisplay = (offer.campaign_title?.trim() || offer.name).trim();
    const showProductTitle = offer.name !== campaignDisplay;
    const startTimeLabel = formatCalendarStartTime(offer.event_time);

    return (
      <div className="relative bg-card border border-border rounded-2xl shadow-md overflow-hidden">
        <span
          className="absolute top-3 right-3 z-10 px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          aria-hidden
        >
          GRAB MODE
        </span>
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground/40" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <CampaignTypeLine campaignDisplay={campaignDisplay} typeLabel={typeLabel} />
            {showProductTitle && (
              <h3 className="text-base font-semibold text-foreground truncate mt-1">{offer.name}</h3>
            )}
            {startTimeLabel && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                <span>Starts {startTimeLabel}</span>
              </p>
            )}
            {offer.location && (
              <p className="text-xs text-muted-foreground truncate mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                {truncate(offer.location, 48)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <Button onClick={onDetails} size="default" className="flex-1 font-bold uppercase tracking-wide">
            Grab
          </Button>
        </div>
      </div>
    );
  }

  const { row, treasure, onDetails } = props;
  const typeLabel = offerTypeLabel(row.offer_type);
  const windowText = formatClaimWindow(treasure.starts_at, treasure.ends_at);
  const campaignDisplay = (row.campaign_title?.trim() || row.name).trim();
  const showProductTitle = row.name !== campaignDisplay;

  return (
    <div className="relative bg-card border border-border rounded-2xl shadow-md overflow-hidden">
      <span
        className="absolute top-3 right-3 z-10 px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md border border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-200"
        aria-hidden
      >
        HUNT MODE
      </span>
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-muted">
          {treasure.clue_image ? (
            <img
              src={treasure.clue_image}
              alt={treasure.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <CampaignTypeLine campaignDisplay={campaignDisplay} typeLabel={typeLabel} />
          {showProductTitle && (
            <h3 className="text-base font-semibold text-foreground truncate mt-1">{row.name}</h3>
          )}
          {treasure.name &&
            treasure.name !== row.name &&
            treasure.name !== row.campaign_title && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{treasure.name}</p>
            )}
          {treasure.address && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" strokeWidth={1.5} />
              {truncate(treasure.address, 45)}
            </p>
          )}
          {windowText && <p className="text-xs text-muted-foreground mt-1">{windowText}</p>}
        </div>
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <Button onClick={onDetails} size="default" className="flex-1 font-bold uppercase tracking-wide">
          Hunt
        </Button>
      </div>
    </div>
  );
}
