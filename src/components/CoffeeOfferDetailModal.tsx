import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Calendar, Users, Coffee } from 'lucide-react';
import type { CoffeeOffer } from '@/hooks/useCoffeeOffers';
import { localYMD } from '@/lib/date';

interface CoffeeOfferDetailModalProps {
  offer: CoffeeOffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoffeeOfferDetailModal({
  offer,
  open,
  onOpenChange,
}: CoffeeOfferDetailModalProps) {
  if (!offer) return null;

  const [showFullTerms, setShowFullTerms] = useState(false);

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

  // =========================
  // Registration Gating Logic
  // =========================
  const today = localYMD(new Date());
  const isEventDate = today === offer.event_date;

  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const afterStartTime =
    !offer.event_time || currentHHMM >= offer.event_time;

  const canRegister = isEventDate && afterStartTime;

  const getRegisterHelperText = () => {
    if (canRegister) return null;

    if (isEventDate && offer.event_time && !afterStartTime) {
      return `Registration opens at ${offer.event_time} on ${formatDate(
        offer.event_date
      )}`;
    }

    return 'Registration is only available on the event date.';
  };

  // =========================
  // Redeem Window Display
  // =========================
  const redeemWindowText = (() => {
    if (offer.event_time && offer.redeem_before_time) {
      return `Redeem: ${offer.event_time} – ${offer.redeem_before_time}`;
    }
    if (offer.redeem_before_time) {
      return `Redeem before: ${offer.redeem_before_time}`;
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
          {/* Date */}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{formatDate(offer.event_date)}</span>
          </div>

          {/* Start Registration Time */}
          {offer.event_time && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Start reg: {offer.event_time}</span>
            </div>
          )}

          {/* Redeem Window */}
          {redeemWindowText && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{redeemWindowText}</span>
            </div>
          )}

          {/* Quantity */}
          {offer.quantity_limit != null && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Quantity: {offer.quantity_limit} spots</span>
            </div>
          )}

          {/* Coffee Types */}
          {offer.coffee_types && offer.coffee_types.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <Coffee className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Coffee type: {offer.coffee_types.join(' • ')}</span>
            </div>
          )}

          {/* Location */}
          {offer.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{offer.location}</span>
            </div>
          )}

          {/* Description */}
          {offer.description && (
            <div className="pt-2 border-t border-foreground/10">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {offer.description}
              </p>
            </div>
          )}

          {/* =========================
              Terms & Conditions
          ========================== */}
          <div className="pt-2 border-t border-foreground/10">
            <h4 className="text-sm font-semibold mb-2">
              Terms & Conditions
            </h4>

            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>• One registration = one redeem.</p>

              <p>
                • Valid only on the event date and redeem window shown.
                No extensions, reschedules, or cash refunds.
              </p>

              {showFullTerms && (
                <p>
                  • In the event of disputes, CoffeeBro and the partner café
                  reserve the right to make the final decision in accordance
                  with these terms.
                </p>
              )}

              <button
                type="button"
                className="text-xs underline underline-offset-2"
                onClick={() => setShowFullTerms((v) => !v)}
              >
                {showFullTerms ? 'Show less' : 'Show more'}
              </button>
            </div>
          </div>

          {/* =========================
              Register CTA
          ========================== */}
          <div className="pt-2 space-y-2">
            <Button
              className="w-full btn-run"
              disabled={!canRegister}
              onClick={() => {
                if (canRegister) {
                  // TODO: wire to actual registration flow
                  onOpenChange(false);
                }
              }}
            >
              GRAB
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