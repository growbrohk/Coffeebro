import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Calendar, Users } from 'lucide-react';
import type { CoffeeOffer } from '@/hooks/useCoffeeOffers';
import { localYMD } from '@/lib/date';

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

  // Registration gating: enabled only on event_date AND after start reg time
  const today = localYMD(new Date());
  const isEventDate = today === offer.event_date;
  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const afterStartTime = !offer.event_time || currentHHMM >= offer.event_time;
  const canRegister = isEventDate && afterStartTime;

  const getRegisterHelperText = () => {
    if (canRegister) return null;
    if (isEventDate && offer.event_time && !afterStartTime) {
      return `Registration opens at ${offer.event_time} on ${formatDate(offer.event_date)}`;
    }
    return 'Registration is only available on the event date.';
  };

  const redeemWindowText = (() => {
    if (offer.event_time && offer.redeem_before_time) {
      return `Redeem: ${offer.event_time} – ${offer.redeem_before_time}`;
    }
    if (offer.redeem_before_time) {
      return `Redeem before: ${offer.redeem_before_time}`;
    }
    if (offer.event_time) {
      return `Start reg: ${offer.event_time}`;
    }
    return null;
  })();

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
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{formatDate(offer.event_date)}</span>
          </div>

          {offer.event_time && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Start reg: {offer.event_time}</span>
            </div>
          )}

          {redeemWindowText && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{redeemWindowText}</span>
            </div>
          )}

          {offer.quantity_limit != null && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Quantity: {offer.quantity_limit} spots</span>
            </div>
          )}

          {offer.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
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

          {/* T&C Block */}
          <div className="pt-2 border-t border-foreground/10">
            <h4 className="text-sm font-semibold mb-2">Terms & Conditions</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
              <li>
                One registration = one redeem. Redemptions are capped at the listed quantity and may end early when the cap is reached.
              </li>
              <li>
                Valid only on the event date, within the redeem window shown. No extensions, reschedules, or cash refunds.
              </li>
              <li>
                Service fulfillment is by the café. CoffeeBro is not responsible for café operational changes but will help coordinate support.
              </li>
            </ul>
          </div>

          {/* Register CTA with time gating */}
          <div className="pt-2 space-y-2">
            <Button
              className="w-full btn-run"
              disabled={!canRegister}
              onClick={() => {
                if (canRegister) {
                  // Placeholder - wire to actual registration flow when available
                  onOpenChange(false);
                }
              }}
            >
              Register
            </Button>
            {getRegisterHelperText() && (
              <p className="text-xs text-muted-foreground text-center">
                {getRegisterHelperText()}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
