import type { ReactNode } from 'react';
import { ImageIcon, Navigation, X } from 'lucide-react';
import { formatHuntRedemptionPeriod } from '@/lib/formatHuntRedemption';
import type { HuntMapTreasure } from '@/types/huntMapTreasure';

import huntPinStar from '@/assets/hunt-pin-star.svg';
import huntPinGrab from '@/assets/hunt-pin-grab.svg';

interface TreasurePopupCardProps {
  treasure: HuntMapTreasure;
  onClose: () => void;
  onDirections: () => void;
  onDetails: () => void;
  distance?: number | null;
  formatDistance?: (m: number) => string;
}

function PillButton({
  children,
  onClick,
  icon,
}: {
  children: ReactNode;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:opacity-90 active:scale-[0.98]"
    >
      {icon}
      {children}
    </button>
  );
}

export function TreasurePopupCard({
  treasure,
  onClose,
  onDirections,
  onDetails,
  distance = null,
  formatDistance = (m) => `${(m / 1000).toFixed(1)} km`,
}: TreasurePopupCardProps) {
  const clue = (treasure as { clue_image?: string | null }).clue_image;
  const redemption = formatHuntRedemptionPeriod(treasure.starts_at, treasure.ends_at);
  const { pinKind, offerTitle } = treasure;

  const imageBlock = (
    <div className="relative w-full aspect-[16/10] bg-muted shrink-0">
      {clue ? (
        <img src={clue} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground/35" strokeWidth={1.25} />
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground shadow-sm"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const distanceRow =
    distance != null && Number.isFinite(distance) ? (
      <p className="text-xs text-muted-foreground">{formatDistance(distance)} away</p>
    ) : null;

  if (pinKind === 'coffee_shop') {
    return (
      <div
        className="fixed left-0 right-0 z-[1100] animate-slide-up px-3"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-[430px] overflow-hidden rounded-t-3xl bg-card shadow-xl">
          {imageBlock}
          <div className="px-4 pb-4 pt-3">
            <h3 className="text-lg font-bold text-foreground">{treasure.name}</h3>
            {treasure.address && (
              <p className="mt-1 text-sm text-muted-foreground">{treasure.address}</p>
            )}
            {distanceRow}
            <div className="mt-4 flex justify-end">
              <PillButton onClick={onDirections} icon={<Navigation className="h-4 w-4 text-primary-foreground" />}>
                directions
              </PillButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pinKind === 'grab') {
    const title = offerTitle ?? 'Offer';
    return (
      <div
        className="fixed left-0 right-0 z-[1100] animate-slide-up px-3"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-[430px] overflow-hidden rounded-t-3xl bg-card shadow-xl">
          {imageBlock}
          <div className="px-4 pb-4 pt-3">
            <div className="flex items-start gap-2">
              <img src={huntPinGrab} alt="" className="mt-0.5 h-6 w-6 shrink-0 object-contain" />
              <p className="text-base font-bold leading-snug text-primary">{title}</p>
            </div>
            <h3 className="mt-2 text-lg font-bold text-foreground">{treasure.name}</h3>
            {treasure.address && (
              <p className="mt-1 text-sm text-muted-foreground">{treasure.address}</p>
            )}
            {redemption && (
              <p className="mt-2 text-xs text-foreground">redemption period: {redemption}</p>
            )}
            {distanceRow && <div className="mt-1">{distanceRow}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onDirections}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
              >
                map
              </button>
              <PillButton
                onClick={onDetails}
                icon={<img src={huntPinGrab} alt="" className="h-4 w-4 object-contain brightness-0 invert" />}
              >
                grab
              </PillButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const huntTitle = offerTitle ?? 'Offer';
  return (
    <div
      className="fixed left-0 right-0 z-[1100] animate-slide-up px-3"
      style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-[430px] overflow-hidden rounded-t-3xl bg-card shadow-xl">
        {imageBlock}
        <div className="px-4 pb-4 pt-3">
          <div className="flex items-start gap-2">
            <img src={huntPinStar} alt="" className="mt-0.5 h-6 w-6 shrink-0 object-contain" />
            <p className="text-base font-bold italic leading-snug text-primary">{huntTitle}</p>
          </div>
          <h3 className="mt-2 text-lg font-bold text-foreground">{treasure.name}</h3>
          {treasure.address && (
            <p className="mt-1 text-sm text-muted-foreground">{treasure.address}</p>
          )}
          {redemption && (
            <p className="mt-2 text-xs text-foreground">redemption period: {redemption}</p>
          )}
          {distanceRow && <div className="mt-1">{distanceRow}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onDirections}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
            >
              map
            </button>
            <PillButton
              onClick={onDetails}
              icon={
                <img src={huntPinStar} alt="" className="h-4 w-4 object-contain brightness-0 invert" />
              }
            >
              hunt
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
}
