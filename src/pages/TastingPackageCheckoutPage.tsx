import { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTastingPackage, useTastingPackageRedemptionDates } from '@/hooks/usePublishedTastingPackages';
import { useTastingPackagePurchase } from '@/hooks/useTastingPackagePurchase';
import { formatTastingPrice } from '@/types/tastingPackage';
import type { TastingPackageTier } from '@/types/tastingPackage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { captureAffiliateRef, clearAffiliateRef, getStoredAffiliateRef } from '@/lib/tastingAffiliateRef';

export type TastingCheckoutLocationState = {
  tier: TastingPackageTier;
};

function formatRedeemDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return format(d, 'd MMM yyyy');
}

function todayHktDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function TastingPackageCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const purchase = useTastingPackagePurchase();
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const state = location.state as TastingCheckoutLocationState | null;
  const tier = state?.tier;

  const { data: pkg, isLoading } = useTastingPackage(id);
  const { data: redemptionDates = [], isLoading: datesLoading } = useTastingPackageRedemptionDates(id);

  const availableDates = useMemo(() => {
    const today = todayHktDateKey();
    return redemptionDates.filter(
      (d) => d.is_available && d.redeem_date >= today && d.remaining > 0,
    );
  }, [redemptionDates]);

  useEffect(() => {
    if (!selectedDate && availableDates.length === 1) {
      setSelectedDate(availableDates[0].redeem_date);
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    if (!id) return;
    const ref = searchParams.get('ref');
    if (ref) captureAffiliateRef(id, ref);
  }, [id, searchParams]);

  useEffect(() => {
    if (!user && id) {
      navigate('/profile', { replace: true });
    }
  }, [user, navigate, id]);

  const amountCents = tier === 'duo' ? pkg?.duo_price_cents : pkg?.single_price_cents;

  const startCheckout = useCallback(async () => {
    if (!user || !id || !tier || !selectedDate) return;
    const ref = getStoredAffiliateRef(id) ?? searchParams.get('ref') ?? undefined;
    setSubmitting(true);
    try {
      const res = await purchase.mutateAsync({ packageId: id, tier, redeemDate: selectedDate, ref });
      if (!res.requiresPayment) {
        clearAffiliateRef(id);
        toast({ title: 'Purchased!', description: 'Check your wallet.' });
        navigate('/vouchers', { replace: true });
        return;
      }
      window.location.assign(res.checkoutUrl);
    } catch (e: unknown) {
      toast({
        title: 'Checkout unavailable',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }, [user, id, tier, selectedDate, searchParams, purchase, navigate, toast]);

  if (!id) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">Invalid link.</p>
      </div>
    );
  }

  if (!user) return null;

  if (!tier) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="mb-4 text-muted-foreground">Open checkout from the package detail page.</p>
        <Button asChild variant="outline">
          <Link to={`/tasting-packages/${id}`}>Back to package</Link>
        </Button>
      </div>
    );
  }

  if (isLoading || datesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">Package not found.</p>
      </div>
    );
  }

  const tierLabel = tier === 'single' ? 'Single' : 'Duo';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-4 py-4">
        <button type="button" onClick={() => navigate(-1)} className="mr-2 p-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold">Checkout</h1>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Package</p>
          <p className="text-base font-semibold">{pkg.title}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Tier</p>
          <p className="text-base">{tierLabel}</p>
        </div>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Redemption day</p>
            <p className="text-xs text-muted-foreground">
              All drinks in this package must be redeemed on the same day during each shop&apos;s opening hours.
            </p>
          </div>
          {availableDates.length === 0 ? (
            <p className="text-sm text-destructive">No redemption dates are available right now.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {availableDates.map((d) => {
                const selected = selectedDate === d.redeem_date;
                return (
                  <button
                    key={d.redeem_date}
                    type="button"
                    onClick={() => setSelectedDate(d.redeem_date)}
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:bg-muted/40',
                    )}
                  >
                    <p className="text-sm font-semibold">{formatRedeemDateLabel(d.redeem_date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.remaining} slot{d.remaining === 1 ? '' : 's'} left
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div>
          <p className="text-sm font-medium text-muted-foreground">Amount</p>
          <p className="text-2xl font-bold tracking-tight">
            {amountCents != null ? formatTastingPrice(amountCents) : '—'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => void startCheckout()}
            disabled={submitting || purchase.isPending || !selectedDate || availableDates.length === 0}
          >
            {(submitting || purchase.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pay with Stripe
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to={`/tasting-packages/${id}`}>Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
