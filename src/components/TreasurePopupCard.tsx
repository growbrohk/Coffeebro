import { ImageIcon, MapPin, Navigation, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTreasureReward } from '@/hooks/useTreasureReward';
import { OFFER_TYPE_LABELS } from '@/lib/offerTypes';
import type { Treasure } from '@/hooks/useHunts';

interface TreasurePopupCardProps {
  treasure: Treasure & { clue_image?: string | null };
  onClose: () => void;
  onDirections: () => void;
  onDetails: () => void;
  distance?: number | null;
  formatDistance?: (m: number) => string;
}

function truncate(str: string, maxLen: number) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function TreasurePopupCard({
  treasure,
  onClose,
  onDirections,
  onDetails,
  distance = null,
  formatDistance = (m) => `${(m / 1000).toFixed(1)} km`,
}: TreasurePopupCardProps) {
  const { data: rewards = [] } = useTreasureReward(treasure.id);
  const primary = rewards[0];
  const offerTypeLabel = primary
    ? OFFER_TYPE_LABELS[primary.offer_type] ?? primary.offer_type
    : null;

  return (
    <div
      className="fixed right-4 left-4 sm:left-auto sm:w-[360px] z-[1100] animate-slide-up"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
    >
      <div className="bg-white rounded-t-3xl shadow-lg overflow-hidden">
        {/* Header with thumbnail and info */}
        <div className="flex items-start gap-3 p-4 pb-3">
          {/* Thumbnail Image */}
          <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
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

          {/* Info Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-0.5">
              <h3 className="text-base font-semibold text-foreground truncate flex-1">
                {treasure.name}
              </h3>
              {treasure.scanned && (
                <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-muted text-muted-foreground">
                  Claimed
                </span>
              )}
            </div>
            {primary && (
              <div className="text-sm text-muted-foreground space-y-0.5">
                <div className="font-medium text-foreground">{primary.title}</div>
                <div>
                  {primary.org_name && <span>{primary.org_name}</span>}
                  {primary.org_name && offerTypeLabel && ' · '}
                  {offerTypeLabel && <span>{offerTypeLabel}</span>}
                </div>
              </div>
            )}
            {treasure.address && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {truncate(treasure.address, 45)}
              </p>
            )}
            {distance != null && Number.isFinite(distance) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{formatDistance(distance)}</span>
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 -mt-1 -mr-1 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 px-4 pb-4">
          <Button
            onClick={onDirections}
            variant="outline"
            size="default"
            className="flex-1 gap-2"
          >
            <Navigation className="w-4 h-4" />
            Directions
          </Button>
          <Button onClick={onDetails} size="default" className="flex-1 gap-2">
            Details
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
