import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Clock, Calendar } from 'lucide-react';
import type { CoffeeOffer } from '@/hooks/useCoffeeOffers';

interface CoffeeOfferDetailModalProps {
  offer: CoffeeOffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoffeeOfferDetailModal({ offer, open, onOpenChange }: CoffeeOfferDetailModalProps) {
  if (!offer) return null;

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border border-foreground/20">
        <DialogHeader>
        <DialogTitle className="text-xl font-bold tracking-tight">
          {offer.name}
        </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(offer.event_date)}</span>
          </div>

          {offer.event_time && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{offer.event_time}</span>
            </div>
          )}

          {offer.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{offer.location}</span>
            </div>
          )}

          {offer.description && (
            <div className="pt-2 border-t border-foreground/10">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {offer.description}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
