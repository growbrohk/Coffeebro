import { ImageIcon, MapPin, Navigation, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Treasure } from '@/hooks/useHunts';

interface TreasurePopupCardProps {
  treasure: Treasure & { clue_image?: string | null };
  onClose: () => void;
  onDirections: () => void;
  onDetails: () => void;
  distance?: number | null;
  formatDistance?: (m: number) => string;
}

export function TreasurePopupCard({
  treasure,
  onClose,
  onDirections,
  onDetails,
  distance = null,
  formatDistance = (m) => `${(m / 1000).toFixed(1)} km`,
}: TreasurePopupCardProps) {
  return (
    <div
      className="absolute left-0 right-0 z-[1100] animate-slide-up"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
    >
      <div className="bg-white rounded-t-3xl shadow-lg mx-4 mb-4 overflow-hidden">
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
            <div className="flex items-start gap-2 mb-1">
              <h3 className="text-base font-semibold text-foreground truncate flex-1">
                {treasure.name}
              </h3>
            </div>
            {distance != null && Number.isFinite(distance) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
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
