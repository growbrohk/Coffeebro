import { ImageIcon, MapPin, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OFFER_TYPE_LABELS } from '@/lib/offerTypes';
import type { CoffeeOffer, HuntOfferForCalendarRow, HuntOfferTreasureEmbed } from '@/hooks/useCoffeeOffers';

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

    return (
      <div className="bg-card border border-border rounded-2xl shadow-md overflow-hidden">
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground/40" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-muted text-muted-foreground">
                Calendar offer campaign
              </span>
              {typeLabel && (
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-orange-500/15 text-orange-700 dark:text-orange-400">
                  {typeLabel}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-foreground truncate">{offer.name}</h3>
            {offer.campaign_title && offer.campaign_title !== offer.name && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{offer.campaign_title}</p>
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
          <Button onClick={onDetails} size="default" className="flex-1 gap-2">
            Details
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  const { row, treasure, onDetails } = props;
  const typeLabel = offerTypeLabel(row.offer_type);
  const windowText = formatClaimWindow(treasure.starts_at, treasure.ends_at);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-md overflow-hidden">
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
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-muted text-muted-foreground">
              Hunt offer campaign
            </span>
            {typeLabel && (
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-orange-500/15 text-orange-700 dark:text-orange-400">
                {typeLabel}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground truncate">{row.name}</h3>
          {row.campaign_title && row.campaign_title !== row.name && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{row.campaign_title}</p>
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
        <Button onClick={onDetails} size="default" className="flex-1 gap-2">
          Details
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
