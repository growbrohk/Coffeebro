import { ImageIcon } from 'lucide-react';
import { formatHuntRedemptionPeriod } from '@/lib/formatHuntRedemption';
import type { CampaignMapItem } from "@/types/campaignMapItem";
import { cn } from '@/lib/utils';

import huntPinGrab from '@/assets/hunt-pin-grab.svg';
import huntPinStar from '@/assets/hunt-pin-star.svg';

/** Card CTA + icon: use campaign type when present so B1G1 hunt stays "hunt". */
function isGrabCampaignCard(t: CampaignMapItem): boolean {
  if (t.campaign_type === "grab") return true;
  if (t.campaign_type === "hunt") return false;
  return t.pinKind === "grab" || t.offerType === "buy1get1free";
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
  showRedemptionPeriod?: boolean;
  variant?: VoucherCarouselVariant;
}

export function VoucherCarouselCard({
  treasure,
  onCta,
  onCardPress,
  showRedemptionPeriod = true,
  variant = 'voucher',
}: VoucherCarouselCardProps) {
  const clue =
    variant === 'cafe'
      ? (treasure.orgPreviewPhotoUrl ?? treasure.clue_image ?? null)
      : (treasure.clue_image ?? null);
  const offerName = treasure.offerTitle?.trim() || 'Offer';
  const nameQuotaTitle =
    treasure.quantityLimit != null
      ? `${offerName} · ${treasure.quantityLimit}`
      : offerName;
  const timeLine = formatHuntRedemptionPeriod(treasure.starts_at, treasure.ends_at);
  const orgLine = treasure.orgName?.trim() || treasure.name;
  const locationLine = treasure.address?.trim() || null;
  const isGrab = isGrabCampaignCard(treasure);
  const isCoffeeShop = treasure.pinKind === "coffee_shop" && !isGrab;
  const ctaLabel = isGrab ? 'grab now' : isCoffeeShop ? 'open' : 'hunt now';
  const cafeTitle = orgLine;
  const cafeLocation = locationLine;

  return (
    <div
      className={cn(
        cardWidthClass,
        'flex flex-col overflow-hidden rounded-t-3xl rounded-b-2xl bg-card shadow-soft',
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
      <div className="hunt-map-voucher-preview-clue">
        {clue ? (
          <img src={clue} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground/35" strokeWidth={1.25} />
          </div>
        )}
      </div>
      {variant === 'cafe' ? (
        <div className="flex min-h-[7.2rem] min-w-0 flex-1 flex-col justify-between gap-1 px-3 pb-2 pt-2">
          <div
            className="flex min-w-0 text-sm font-bold leading-snug text-foreground"
            title={cafeTitle}
          >
            <span className="min-w-0 line-clamp-2">{cafeTitle}</span>
          </div>
          {cafeLocation ? (
            <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
              {cafeLocation}
            </p>
          ) : null}
          <div className="my-1 border-t border-dashed border-border" />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCta(treasure);
              }}
              className="tap-press inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-md hover:opacity-90"
            >
              view
            </button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[7.2rem] min-w-0 flex-1 flex-col justify-between gap-1 px-3 pb-2 pt-2">
          <div
            className="flex min-w-0 items-center gap-1 text-sm font-bold leading-snug text-foreground"
            title={nameQuotaTitle}
          >
            <span className="min-w-0 truncate">{offerName}</span>
            {treasure.quantityLimit != null ? (
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground/80">
                · {treasure.quantityLimit}
              </span>
            ) : null}
          </div>
          {showRedemptionPeriod && timeLine ? (
            <p className="text-[11px] text-muted-foreground">Available: {timeLine}</p>
          ) : null}
          <p className="min-w-0 truncate text-xs font-medium text-foreground" title={orgLine}>
            {orgLine}
          </p>
          {locationLine ? (
            <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">{locationLine}</p>
          ) : null}
          <div className="my-1 border-t border-dashed border-border" />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCta(treasure);
              }}
              className="tap-press inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-md hover:opacity-90"
            >
              {isGrab ? (
                <img
                  src={huntPinGrab}
                  alt=""
                  className="h-3.5 w-3.5 object-contain brightness-0 invert"
                />
              ) : (
                <img
                  src={huntPinStar}
                  alt=""
                  className="h-3.5 w-3.5 object-contain brightness-0 invert"
                />
              )}
              {ctaLabel}
            </button>
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
  showRedemptionPeriod?: boolean;
  variant?: VoucherCarouselVariant;
  className?: string;
}

export function VoucherCarouselRow({
  items,
  onCta,
  onCardPress,
  showRedemptionPeriod = true,
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
          showRedemptionPeriod={showRedemptionPeriod}
          variant={variant}
        />
      ))}
    </div>
  );
}
