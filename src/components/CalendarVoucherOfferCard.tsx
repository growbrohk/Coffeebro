import { Fragment, type ReactNode } from 'react';
import { Clock, ImageIcon, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CoffeeOffer, HuntOfferForCalendarRow, HuntOfferTreasureEmbed } from '@/hooks/useCoffeeOffers';
import { useVoucherCountForOffer } from '@/hooks/useVouchers';

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

/** Calendar times (`event_time`, `redeem_before_time`) as HH:MM or HH:MM:SS */
function formatCalendarTimeHHMM(time: string | null | undefined): string | null {
  if (!time?.trim()) return null;
  const t = time.trim();
  return t.length >= 5 ? t.slice(0, 5) : t;
}

/** Headline: campaign · remaining left (preset name & offer type hidden) */
function GrabCampaignHeadline({ offer }: { offer: CoffeeOffer }) {
  const { data: voucherCount = 0, isPending } = useVoucherCountForOffer(offer.id);
  const campaignDisplay = (offer.campaign_title?.trim() || offer.name).trim();
  const limit = offer.quantity_limit;

  let quotaSegment: ReactNode = null;
  if (limit != null) {
    quotaSegment = isPending ? (
      <span className="text-muted-foreground font-normal">…</span>
    ) : (
      <span className="text-muted-foreground font-normal">
        {Math.max(0, limit - voucherCount)} left
      </span>
    );
  }

  const segments: ReactNode[] = [<span key="camp">{campaignDisplay}</span>];
  if (quotaSegment) {
    segments.push(
      <Fragment key="q">
        <span className="text-muted-foreground/50 font-normal"> · </span>
        {quotaSegment}
      </Fragment>
    );
  }

  return (
    <p className="text-sm font-semibold text-foreground truncate pr-20 min-w-0">{segments}</p>
  );
}

function HuntCampaignHeadline({
  row,
}: {
  row: HuntOfferForCalendarRow;
}) {
  const { data: voucherCount = 0, isPending } = useVoucherCountForOffer(row.id);
  const campaignDisplay = (row.campaign_title?.trim() || row.name).trim();
  const limit = row.quantity_limit;

  let quotaSegment: ReactNode = null;
  if (limit != null) {
    quotaSegment = isPending ? (
      <span className="text-muted-foreground font-normal">…</span>
    ) : (
      <span className="text-muted-foreground font-normal">
        {Math.max(0, limit - voucherCount)} left
      </span>
    );
  }

  const segments: ReactNode[] = [<span key="camp">{campaignDisplay}</span>];
  if (quotaSegment) {
    segments.push(
      <Fragment key="q">
        <span className="text-muted-foreground/50 font-normal"> · </span>
        {quotaSegment}
      </Fragment>
    );
  }

  return (
    <p className="text-sm font-semibold text-foreground truncate pr-20 min-w-0">{segments}</p>
  );
}

function GrabModeTimesOnly({ offer }: { offer: CoffeeOffer }) {
  const start = formatCalendarTimeHHMM(offer.event_time);
  const end = formatCalendarTimeHHMM(offer.redeem_before_time);

  const parts: { key: string; node: ReactNode }[] = [];
  if (start) parts.push({ key: 'start', node: <>Starts {start}</> });
  if (end) parts.push({ key: 'end', node: <>Until {end}</> });

  if (parts.length === 0) return null;

  return (
    <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <Clock className="w-3 h-3 shrink-0" strokeWidth={1.5} />
      {parts.map((p, i) => (
        <Fragment key={p.key}>
          {i > 0 && <span className="text-muted-foreground/50">·</span>}
          {p.node}
        </Fragment>
      ))}
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
            <GrabCampaignHeadline offer={offer} />
            <GrabModeTimesOnly offer={offer} />
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
  const windowText = formatClaimWindow(treasure.starts_at, treasure.ends_at);

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
          <HuntCampaignHeadline row={row} />
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
