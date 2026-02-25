import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Calendar, Users, Coffee, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';
import type { CoffeeOffer } from '@/hooks/useCoffeeOffers';
import { localYMD } from '@/lib/date';
import { useMyVoucherForOffer, useVoucherCountForOffer, useMintVoucher } from '@/hooks/useVouchers';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [selectedCoffeeType, setSelectedCoffeeType] = useState<string | null>(null);
  const [mintedCode, setMintedCode] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const { toast } = useToast();

  // Fetch user's voucher for this offer
  const { data: myVoucher, refetch: refetchVoucher } = useMyVoucherForOffer(offer.id);
  
  // Fetch voucher count for sold-out check
  const { data: voucherCount = 0, refetch: refetchCount } = useVoucherCountForOffer(offer.id);
  
  // Mint voucher mutation
  const mintVoucher = useMintVoucher();

  // Reset minted code when offer changes or modal closes
  useEffect(() => {
    if (!open || !offer) {
      setMintedCode(null);
      setSelectedCoffeeType(null);
      setQrOpen(false);
    }
  }, [open, offer?.id]);

  const hasVoucher = !!myVoucher;
  const isSoldOut = offer.quantity_limit != null && voucherCount >= offer.quantity_limit;

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
    if (hasVoucher) {
      return null; // User already has voucher
    }
    
    if (isSoldOut) {
      return 'This offer is sold out.';
    }

    if (canRegister) {
      // Check if coffee selection is required
      if (offer.coffee_types && offer.coffee_types.length > 0 && !selectedCoffeeType) {
        return 'Please choose your coffee option.';
      }
      return null;
    }

    if (isEventDate && offer.event_time && !afterStartTime) {
      return `Registration opens at ${offer.event_time} on ${formatDate(
        offer.event_date
      )}`;
    }

    return 'Registration is only available on the event date.';
  };

  const handleGrab = async () => {
    if (!canRegister || isSoldOut || hasVoucher) return;

    // Validate coffee selection if required
    if (offer.coffee_types && offer.coffee_types.length > 0 && !selectedCoffeeType) {
      toast({
        title: 'Selection required',
        description: 'Please choose your coffee option.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await mintVoucher.mutateAsync({
        offerId: offer.id,
        selectedCoffeeType: selectedCoffeeType,
      });

      // Store the minted code
      setMintedCode(result.code);

      // Refetch voucher and count
      await refetchVoucher();
      await refetchCount();

      toast({
        title: 'Grabbed!',
        description: `Your voucher code: ${result.code}`,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to grab voucher';
      
      // Map error codes to user-friendly messages
      let userMessage = errorMessage;
      if (errorMessage === 'SOLD_OUT') {
        userMessage = 'This offer is sold out.';
      } else if (errorMessage === 'ALREADY_CLAIMED') {
        userMessage = 'You have already claimed this offer.';
      } else if (errorMessage === 'MISSING_COFFEE_TYPE' || errorMessage === 'INVALID_COFFEE_TYPE') {
        userMessage = 'Please select a valid coffee option.';
      }

      toast({
        title: 'Error',
        description: userMessage,
        variant: 'destructive',
      });
    }
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
    <>
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

          {/* Voucher Code */}
          {hasVoucher && (myVoucher.code || mintedCode) && (
            <div className="pt-2 border-t border-foreground/10">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Your Voucher Code</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono font-bold text-2xl tracking-widest">
                    {myVoucher.code || mintedCode}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQrOpen(true)}
                    aria-label="Show QR code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Coffee Options / Your Coffee */}
          {hasVoucher && myVoucher.selected_coffee_type ? (
            <div className="flex items-center gap-3 text-sm">
              <Coffee className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Your coffee: {myVoucher.selected_coffee_type}</span>
            </div>
          ) : offer.coffee_types && offer.coffee_types.length > 0 ? (
            <div className="flex items-center gap-3 text-sm">
              <Coffee className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Coffee options: {offer.coffee_types.join(' • ')}</span>
            </div>
          ) : null}

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
              Coffee Selection (before GRAB)
          ========================== */}
          {!hasVoucher && 
           offer.coffee_types && 
           offer.coffee_types.length > 0 && (
            <div className="pt-2 border-t border-foreground/10 space-y-2">
              <label className="text-sm font-semibold">Choose your coffee</label>
              <div className="flex flex-wrap gap-2">
                {offer.coffee_types.map((coffeeType) => (
                  <Button
                    key={coffeeType}
                    type="button"
                    variant={selectedCoffeeType === coffeeType ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'btn-run',
                      selectedCoffeeType === coffeeType && 'btn-run-yes'
                    )}
                    onClick={() => {
                      setSelectedCoffeeType(
                        selectedCoffeeType === coffeeType ? null : coffeeType
                      );
                    }}
                  >
                    {coffeeType}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* =========================
              Register CTA
          ========================== */}
          <div className="pt-2 space-y-2">
            {hasVoucher ? (
              <Button className="w-full btn-run" disabled>
                Already Grabbed
              </Button>
            ) : (
              <Button
                className="w-full btn-run"
                disabled={
                  !canRegister ||
                  isSoldOut ||
                  (offer.coffee_types && offer.coffee_types.length > 0 && !selectedCoffeeType) ||
                  mintVoucher.isPending
                }
                onClick={handleGrab}
              >
                {mintVoucher.isPending ? 'Grabbing...' : 'GRAB'}
              </Button>
            )}

            {getRegisterHelperText() && (
              <p className="text-xs text-muted-foreground text-center">
                {getRegisterHelperText()}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* QR Code Dialog */}
    {hasVoucher && (myVoucher.code || mintedCode) && (
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Scan to Redeem</DialogTitle>
          </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-3 rounded-md">
                <QRCode
                  value={(myVoucher.code || mintedCode) || ''}
                  size={220}
                />
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {myVoucher.code || mintedCode}
              </p>
            </div>
        </DialogContent>
      </Dialog>
    )}
  </>
  );
}