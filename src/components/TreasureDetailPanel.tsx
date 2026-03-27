import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Clock, ScanLine } from 'lucide-react';
import { useTreasure } from '@/hooks/useHunts';
import { useMyClaimedTreasureIds } from '@/hooks/useHunts';
import { useTreasureReward } from '@/hooks/useTreasureReward';
import { useTreasureClaimCount } from '@/hooks/useTreasureClaimCount';
import { useGeolocation, haversineDistance } from '@/hooks/useGeolocation';
import { OFFER_TYPE_LABELS } from '@/lib/offerTypes';

function formatTreasureClaimWindow(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined
): string | null {
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
  if (endsAt) return `Claim until ${format(endsAt)}`;
  if (startsAt) return `Opens ${format(startsAt)}`;
  return null;
}

interface TreasureDetailPanelProps {
  huntId: string;
  treasureId: string;
}

export function TreasureDetailPanel({ huntId, treasureId }: TreasureDetailPanelProps) {
  const navigate = useNavigate();
  const { data: treasure, isLoading } = useTreasure(treasureId || null, huntId || undefined);
  const { data: claimedIds } = useMyClaimedTreasureIds();
  const { data: rewards = [] } = useTreasureReward(treasureId || null);
  const { data: claimCount = 0 } = useTreasureClaimCount(treasureId || null);
  const { position: userPosition } = useGeolocation();

  const isClaimed = treasure && claimedIds?.has(treasure.id);
  const primary = rewards[0];

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
    if (!win) {
      window.location.href = url;
    }
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

  const claimWindowText = treasure ? formatTreasureClaimWindow(treasure.starts_at, treasure.ends_at) : null;

  const quotaText =
    treasure?.claim_limit != null ? `${Math.max(0, treasure.claim_limit - claimCount)} available` : null;

  const offerTypeLabel = primary
    ? OFFER_TYPE_LABELS[primary.offer_type] ?? primary.offer_type
    : null;

  if (!treasureId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!treasure) {
    return <p className="text-center text-muted-foreground py-8">Treasure not found</p>;
  }

  return (
    <div>
      <div className="aspect-video rounded-2xl overflow-hidden mb-6 bg-muted animate-fade-in">
        {(treasure as { clue_image?: string | null }).clue_image ? (
          <img
            src={(treasure as { clue_image?: string | null }).clue_image!}
            alt={`Clue for ${treasure.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex items-start gap-2 mb-2">
          <h2 className="text-2xl font-bold flex-1">{treasure.name}</h2>
          {isClaimed && (
            <span className="shrink-0 px-2 py-1 text-xs font-semibold uppercase rounded bg-primary/20 text-primary">
              Claimed
            </span>
          )}
        </div>

        {treasure.address && <p className="text-sm text-muted-foreground mb-2">{treasure.address}</p>}

        {distanceM != null && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="w-4 h-4" strokeWidth={1.5} />
            <span>{(distanceM / 1000).toFixed(1)} km away</span>
          </div>
        )}

        {primary && (
          <div className="space-y-1 mb-4">
            <div className="text-sm font-medium text-foreground flex items-center gap-1.5 flex-wrap">
              <span>{primary.title}</span>
              {quotaText && (
                <span className="text-muted-foreground font-normal">· {quotaText}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {primary.org_name && (
                <span className="text-sm text-muted-foreground">{primary.org_name}</span>
              )}
              {offerTypeLabel && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-muted text-muted-foreground">
                  {offerTypeLabel}
                </span>
              )}
            </div>
          </div>
        )}

        {claimWindowText && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="w-4 h-4" strokeWidth={1.5} />
            <span>{claimWindowText}</span>
          </div>
        )}

        {treasure.description && <p className="text-sm text-foreground mb-6">{treasure.description}</p>}

        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={() => huntId && navigate(`/hunts/${huntId}/scan`)}
            disabled={!huntId}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-full font-medium border-2 border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <ScanLine className="w-5 h-5" />
            Scan
          </button>
          {hasLocation ? (
            <button
              type="button"
              onClick={openInMaps}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              <Navigation className="w-5 h-5" />
              <span className="hidden min-[380px]:inline">Open in Google Maps</span>
              <span className="min-[380px]:hidden">Maps</span>
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 px-2 py-4 bg-muted text-muted-foreground rounded-full font-medium text-center text-sm">
              <MapPin className="w-5 h-5 shrink-0" />
              <span className="leading-tight">No location</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
