import { ImageIcon, X } from 'lucide-react';
import { formatHuntRedemptionPeriod } from '@/lib/formatHuntRedemption';
import type { HuntMapTreasure } from '@/types/huntMapTreasure';

import huntPinGrab from '@/assets/hunt-pin-grab.svg';
import huntPinStar from '@/assets/hunt-pin-star.svg';

export function voucherCarouselTitle(items: HuntMapTreasure[]): string {
  const n = items.length;
  const hasGrab = items.some((t) => t.pinKind === 'grab');
  const hasHunt = items.some((t) => t.pinKind === 'hunt');
  const voucherWord = n === 1 ? 'voucher' : 'vouchers';

  if (hasGrab && !hasHunt) {
    return `${n} ${voucherWord} for you to grab`;
  }
  if (hasHunt && !hasGrab) {
    return `${n} ${voucherWord} for you to hunt`;
  }
  return n === 1
    ? '1 voucher waiting for you to grab & hunt'
    : `${n} vouchers waiting for you to grab & hunt`;
}

interface HuntMapVoucherCarouselSheetProps {
  items: HuntMapTreasure[];
  onClose: () => void;
  onCta: (treasure: HuntMapTreasure) => void;
  onCardPress?: (treasure: HuntMapTreasure) => void;
}

export function HuntMapVoucherCarouselSheet({
  items,
  onClose,
  onCta,
  onCardPress,
}: HuntMapVoucherCarouselSheetProps) {
  if (items.length === 0) return null;

  const title = voucherCarouselTitle(items);

  return (
    <div
      className="fixed left-0 right-0 z-[1005] animate-slide-up px-3"
      style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-[430px] overflow-hidden rounded-t-2xl bg-card pb-2 pt-2 shadow-xl">
        <div className="relative px-1 pr-7">
          <h2 className="pl-3 text-sm font-bold leading-snug text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0.5 top-0 flex h-7 w-7 items-center justify-center rounded-full text-foreground opacity-70 transition-opacity hover:opacity-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div
          className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-0.5 pl-3 pr-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollPaddingLeft: '0.75rem' }}
        >
          {items.map((treasure) => {
            const clue = treasure.clue_image;
            const offerName = treasure.offerTitle?.trim() || 'Offer';
            const nameQuotaTitle =
              treasure.quantityLimit != null
                ? `${offerName} · ${treasure.quantityLimit}`
                : offerName;
            const timeLine = formatHuntRedemptionPeriod(treasure.starts_at, treasure.ends_at);
            const orgLine = treasure.orgName?.trim() || treasure.name;
            const isGrab = treasure.pinKind === 'grab';

            return (
              <div
                key={treasure.id}
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
                className={`flex w-[calc((min(430px,100vw-1.5rem)-1.5rem-1rem)/2.25)] shrink-0 snap-start flex-col overflow-hidden rounded-t-3xl rounded-b-2xl bg-card shadow-md ${
                  onCardPress ? 'cursor-pointer' : ''
                }`}
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
                  {timeLine ? (
                    <p className="text-[11px] text-muted-foreground">Available: {timeLine}</p>
                  ) : null}
                  <p className="text-xs font-medium text-foreground">{orgLine}</p>
                  <div className="my-1 border-t border-dashed border-border" />
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCta(treasure);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold lowercase text-primary-foreground shadow-md transition-transform hover:opacity-90 active:scale-[0.98]"
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
                      {isGrab ? 'grab' : 'hunt'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
