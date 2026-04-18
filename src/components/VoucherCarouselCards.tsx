import { ImageIcon } from 'lucide-react';
import type { CampaignMapItem } from "@/types/campaignMapItem";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import huntPinGrab from '@/assets/hunt-pin-grab.svg';
import huntPinStar from '@/assets/hunt-pin-star.svg';

/** Card CTA + icon: use campaign type when present so B1G1 hunt stays "hunt". */
function isGrabCampaignCard(t: CampaignMapItem): boolean {
  if (t.campaign_type === "grab") return true;
  if (t.campaign_type === "hunt") return false;
  return t.pinKind === "grab" || t.offerType === "buy1get1free";
}

/** Short promo line on the campaign image (matches map / design). */
function campaignImageBadgeText(t: CampaignMapItem): string {
  const ot = t.offerType?.trim().toLowerCase() ?? '';
  if (ot === 'buy1get1free' || ot.includes('buy1get')) return 'buy 1 get 1 free';
  if (ot === '$17coffee' || ot.includes('$17')) return '$17 drink';
  if (ot === 'free') return 'free';
  if (t.offerType?.trim()) {
    const s = t.offerType.trim();
    return s.length > 26 ? `${s.slice(0, 24)}…` : s;
  }
  return t.offerTitle?.trim() || 'Offer';
}

export function voucherCarouselTitle(items: CampaignMapItem[]): string {
  const n = items.length;
  const voucherWord = n === 1 ? "voucher" : "vouchers";
  return `${n} ${voucherWord} for you to grab/hunt`;
}

const cardWidthClass =
  'w-[calc((min(430px,100vw-1.5rem)-1.5rem-1rem)/2.25)] shrink-0 snap-start';

export type VoucherCarouselVariant = 'voucher' | 'cafe';

interface VoucherCarouselCardProps {
  treasure: CampaignMapItem;
  onCta: (treasure: CampaignMapItem) => void;
  onCardPress?: (treasure: CampaignMapItem) => void;
  variant?: VoucherCarouselVariant;
}

function VoucherTicketDivider({ bodyClass }: { bodyClass: string }) {
  return (
    <div
      className={cn('relative h-2 flex-shrink-0 overflow-hidden', bodyClass)}
      aria-hidden
    >
      <div className="absolute inset-x-3 top-1/2 border-t border-dashed border-border" />
    </div>
  );
}

export function VoucherCarouselCard({
  treasure,
  onCta,
  onCardPress,
  variant = 'voucher',
}: VoucherCarouselCardProps) {
  const coverImage =
    treasure.orgPreviewPhotoUrl ?? treasure.clue_image ?? null;
  const offerName = treasure.offerTitle?.trim() || 'Offer';
  const nameQuotaTitle =
    treasure.vouchersRemaining != null
      ? `${offerName} · ${treasure.vouchersRemaining}`
      : offerName;
  const orgLine = treasure.orgName?.trim() || treasure.name;
  const locationLine = treasure.address?.trim() || null;
  const isGrab = isGrabCampaignCard(treasure);
  const isCoffeeShop = treasure.pinKind === "coffee_shop" && !isGrab;
  const ctaLabel = isGrab ? 'grab now' : isCoffeeShop ? 'open' : 'hunt now';
  const cafeTitle = orgLine;
  const cafeLocation = locationLine;
  const badgeText = campaignImageBadgeText(treasure);

  const campaignBodyClass = 'bg-muted/40';

  return (
    <div
      className={cn(
        cardWidthClass,
        'flex flex-col',
        variant === 'voucher'
          ? 'overflow-visible rounded-t-3xl rounded-b-2xl bg-muted/40 shadow-soft'
          : 'overflow-hidden rounded-2xl border border-border/40 bg-muted/25 shadow-none',
        onCardPress && 'tap-card cursor-pointer'
      )}
      role={onCardPress ? 'button' : undefined}
      tabIndex={onCardPress ? 0 : undefined}
      onClick={() => onCardPress?.(treasure)}
      onKeyDown={(e) => {
        if (!onCardPress) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardPress(treasure);
        }
      }}
    >
      <div
        className={cn(
          'hunt-map-voucher-preview-clue relative overflow-hidden',
          variant === 'cafe' ? 'rounded-t-2xl' : 'rounded-t-3xl'
        )}
      >
        {coverImage ? (
          <img src={coverImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground/35" strokeWidth={1.25} />
          </div>
        )}
        {variant === 'voucher' ? (
          <div className="absolute right-2 top-2 max-w-[min(92%,12rem)]">
            <p
              className="truncate rounded-full bg-foreground px-2 py-0.5 text-center text-[10px] font-semibold leading-tight text-background shadow-sm"
              title={badgeText}
            >
              {badgeText}
            </p>
          </div>
        ) : null}
      </div>

      {variant === 'cafe' ? (
        <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 pb-3 pt-2">
          <div
            className="min-w-0 text-sm font-bold leading-snug text-foreground"
            title={cafeTitle}
          >
            <span className="line-clamp-2">{cafeTitle}</span>
          </div>
          {cafeLocation ? (
            <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
              {cafeLocation}
            </p>
          ) : null}
        </div>
      ) : (
        <div className={cn('flex min-w-0 flex-1 flex-col rounded-b-2xl bg-muted/40')}>
          <VoucherTicketDivider bodyClass={campaignBodyClass} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 px-3 pb-3 pt-1">
            <div
              className="flex min-w-0 items-baseline gap-1 text-sm font-bold leading-snug text-foreground"
              title={nameQuotaTitle}
            >
              <span className="min-w-0 truncate">{offerName}</span>
              {treasure.vouchersRemaining != null ? (
                <>
                  <span className="shrink-0 text-sm font-bold text-foreground" aria-hidden>
                    ·
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                    {treasure.vouchersRemaining}
                  </span>
                </>
              ) : null}
            </div>
            <p className="min-w-0 text-sm font-bold leading-snug text-foreground line-clamp-2" title={orgLine}>
              {orgLine}
            </p>
            {locationLine ? (
              <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">{locationLine}</p>
            ) : null}
            <div className="mt-auto flex justify-start pt-1">
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 rounded-full px-4 text-xs font-semibold [&_img]:h-3.5 [&_img]:w-3.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onCta(treasure);
                }}
              >
                {isGrab ? (
                  <img
                    src={huntPinGrab}
                    alt=""
                    className="object-contain brightness-0 invert"
                  />
                ) : (
                  <img
                    src={huntPinStar}
                    alt=""
                    className="object-contain brightness-0 invert"
                  />
                )}
                {ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface VoucherCarouselRowProps {
  items: CampaignMapItem[];
  onCta: (treasure: CampaignMapItem) => void;
  onCardPress?: (treasure: CampaignMapItem) => void;
  variant?: VoucherCarouselVariant;
  className?: string;
}

export function VoucherCarouselRow({
  items,
  onCta,
  onCardPress,
  variant = 'voucher',
  className,
}: VoucherCarouselRowProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'flex snap-x snap-mandatory gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
      style={{ scrollPaddingLeft: '0.75rem' }}
    >
      {items.map((treasure) => (
        <VoucherCarouselCard
          key={treasure.id}
          treasure={treasure}
          onCta={onCta}
          onCardPress={onCardPress}
          variant={variant}
        />
      ))}
    </div>
  );
}
