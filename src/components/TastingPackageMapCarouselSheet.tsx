import { X } from 'lucide-react';
import type { CampaignMapItem } from '@/types/campaignMapItem';
import { VoucherCarouselRow } from '@/components/VoucherCarouselCards';

interface TastingPackageMapCarouselSheetProps {
  items: CampaignMapItem[];
  onClose: () => void;
  onCta: (treasure: CampaignMapItem) => void;
  onCardPress?: (treasure: CampaignMapItem) => void;
  onSelectPackage?: (treasure: CampaignMapItem) => void;
  selectedPackageId?: string | null;
}

export function TastingPackageMapCarouselSheet({
  items,
  onClose,
  onCta,
  onCardPress,
  onSelectPackage,
  selectedPackageId,
}: TastingPackageMapCarouselSheetProps) {
  if (items.length === 0) return null;

  const title = `${items.length} tasting package${items.length === 1 ? '' : 's'}`;

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

        <VoucherCarouselRow
          items={items}
          variant="tasting_package"
          onCta={(t) => {
            onSelectPackage?.(t);
            onCta(t);
          }}
          onCardPress={(t) => {
            onSelectPackage?.(t);
            onCardPress?.(t);
          }}
          className="mt-2 pl-3 pr-3"
        />
      </div>
    </div>
  );
}
