import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react';
import { useTreasure } from '@/hooks/useHunts';
import { useMyClaimedTreasureIds } from '@/hooks/useHunts';
import { useTreasureReward } from '@/hooks/useTreasureReward';
import { useGeolocation, haversineDistance } from '@/hooks/useGeolocation';
import { formatHuntRedemptionPeriod } from '@/lib/formatHuntRedemption';
import { pinKindForTreasure } from '@/lib/huntMapPinKind';

import huntPinStar from '@/assets/hunt-pin-star.svg';
import huntPinGrab from '@/assets/hunt-pin-grab.svg';

const ORANGE = '#F58220';

interface TreasureDetailPanelProps {
  huntId: string;
  treasureId: string;
}

export function TreasureDetailPanel({ huntId, treasureId }: TreasureDetailPanelProps) {
  const navigate = useNavigate();
  const { data: treasure, isLoading } = useTreasure(treasureId || null, huntId || undefined);
  const { data: claimedIds } = useMyClaimedTreasureIds();
  const { data: rewards = [] } = useTreasureReward(treasureId || null);
  const { position: userPosition } = useGeolocation();

  const primary = rewards[0];
  const pinKind = pinKindForTreasure(primary?.offer_type ?? null);

  const isClaimed = treasure && claimedIds?.has(treasure.id);

  const hasLocation =
    treasure &&
    treasure.lat != null &&
    treasure.lng != null &&
    Number.isFinite(treasure.lat) &&
    Number.isFinite(treasure.lng);

  const openInMaps = () => {
    if (!treasure || !hasLocation) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${treasure.lat},${treasure.lng}`;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
      window.location.href = url;
      return;
    }
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) window.location.href = url;
  };

  const distanceM =
    treasure &&
    userPosition &&
    treasure.lat != null &&
    treasure.lng != null &&
    Number.isFinite(treasure.lat) &&
    Number.isFinite(treasure.lng)
      ? haversineDistance(userPosition.lat, userPosition.lng, treasure.lat, treasure.lng)
      : null;

  const redemption = treasure
    ? formatHuntRedemptionPeriod(treasure.starts_at, treasure.ends_at)
    : null;

  const goBack = () => {
    navigate('/hunts');
  };

  if (!treasureId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!treasure) {
    return <p className="py-8 text-center text-muted-foreground">Treasure not found</p>;
  }

  const primaryPresetClue = primary?.preset_clue_image ?? null;
  const treasureClue = (treasure as { clue_image?: string | null }).clue_image ?? null;
  const clue = primaryPresetClue || treasureClue;

  const footerPillClass =
    'inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white active:scale-[0.99] transition-transform';
  const footerStyle = { backgroundColor: ORANGE };

  return (
    <div className="pb-32">
      <div className="relative w-full aspect-[4/3] bg-muted">
        {clue ? (
          <img src={clue} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="h-14 w-14 text-muted-foreground/50" />
          </div>
        )}
        <button
          type="button"
          onClick={goBack}
          className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-foreground shadow-sm"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pt-5">
        {pinKind === 'coffee_shop' ? (
          <>
            <h1 className="text-xl font-bold text-foreground">{treasure.name}</h1>
            {treasure.address && (
              <p className="mt-2 text-sm text-foreground">{treasure.address}</p>
            )}
            {distanceM != null && (
              <p className="mt-2 text-sm text-muted-foreground">
                {(distanceM / 1000).toFixed(1)} km away
              </p>
            )}
            {isClaimed && (
              <span className="mt-2 inline-block rounded bg-muted px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                Claimed
              </span>
            )}
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold leading-snug" style={{ color: ORANGE }}>
              {primary?.title ?? 'Offer'}
            </h1>
            <p className="mt-3 text-lg font-bold text-foreground">{treasure.name}</p>
            {treasure.address && (
              <p className="mt-1 text-sm text-foreground">{treasure.address}</p>
            )}
            {redemption && (
              <p className="mt-3 text-sm text-foreground">redemption period: {redemption}</p>
            )}
            <p className="mt-3 text-sm text-foreground">
              <span className="font-medium">game play: </span>
              grab the coupon on coffeebro
            </p>
            {primary?.description ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-foreground">terms &amp; conditions:</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {primary.description}
                </p>
              </div>
            ) : null}
            {distanceM != null && (
              <p className="mt-3 text-sm text-muted-foreground">
                {(distanceM / 1000).toFixed(1)} km away
              </p>
            )}
            {isClaimed && (
              <span className="mt-2 inline-block rounded bg-muted px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                Claimed
              </span>
            )}
          </>
        )}
      </div>

      <div
        className="fixed left-0 right-0 z-[100] flex gap-2 border-t border-border bg-background px-3 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto flex w-full max-w-[430px] gap-2">
          {pinKind === 'coffee_shop' ? (
            <button
              type="button"
              onClick={openInMaps}
              disabled={!hasLocation}
              className={footerPillClass}
              style={footerStyle}
            >
              <Navigation className="h-4 w-4 text-white" />
              directions
            </button>
          ) : pinKind === 'grab' ? (
            <>
              <button
                type="button"
                onClick={() => huntId && navigate(`/hunts/${huntId}/scan`)}
                disabled={!huntId}
                className={footerPillClass}
                style={footerStyle}
              >
                <img src={huntPinGrab} alt="" className="h-4 w-4 object-contain brightness-0 invert" />
                grab now
              </button>
              <button
                type="button"
                onClick={openInMaps}
                disabled={!hasLocation}
                className={footerPillClass}
                style={footerStyle}
              >
                <Navigation className="h-4 w-4 text-white" />
                directions
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => huntId && navigate(`/hunts/${huntId}/scan`)}
                disabled={!huntId}
                className={footerPillClass}
                style={footerStyle}
              >
                <img src={huntPinStar} alt="" className="h-4 w-4 object-contain brightness-0 invert" />
                hunt
              </button>
              <button
                type="button"
                onClick={openInMaps}
                disabled={!hasLocation}
                className={footerPillClass}
                style={footerStyle}
              >
                <Navigation className="h-4 w-4 text-white" />
                directions
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
