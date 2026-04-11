import { X } from 'lucide-react';
import type { CampaignMapItem } from "@/types/campaignMapItem";
import { VoucherCarouselRow, voucherCarouselTitle } from '@/components/VoucherCarouselCards';

interface HuntMapVoucherCarouselSheetProps {
  items: CampaignMapItem[];
  onClose: () => void;
  onCta: (treasure: CampaignMapItem) => void;
  onCardPress?: (treasure: CampaignMapItem) => void;
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

        <VoucherCarouselRow
          items={items}
          onCta={onCta}
          onCardPress={onCardPress}
          showRedemptionPeriod
          className="mt-2 pl-3 pr-3"
        />
      </div>
    </div>
  );
}
