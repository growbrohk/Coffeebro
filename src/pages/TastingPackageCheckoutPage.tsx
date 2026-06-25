import { useCallback, useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTastingPackage } from '@/hooks/usePublishedTastingPackages';
import { useTastingPackagePurchase } from '@/hooks/useTastingPackagePurchase';
import { formatTastingPrice } from '@/types/tastingPackage';
import type { TastingPackageTier } from '@/types/tastingPackage';
import { useToast } from '@/hooks/use-toast';

export type TastingCheckoutLocationState = {
  tier: TastingPackageTier;
};

export default function TastingPackageCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const purchase = useTastingPackagePurchase();
  const [submitting, setSubmitting] = useState(false);

  const state = location.state as TastingCheckoutLocationState | null;
  const tier = state?.tier;

  const { data: pkg, isLoading } = useTastingPackage(id);

  useEffect(() => {
    if (!user && id) {
      navigate('/profile', { replace: true });
    }
  }, [user, navigate, id]);

  const amountCents = tier === 'duo' ? pkg?.duo_price_cents : pkg?.single_price_cents;

  const startCheckout = useCallback(async () => {
    if (!user || !id || !tier) return;
    setSubmitting(true);
    try {
      const res = await purchase.mutateAsync({ packageId: id, tier });
      if (!res.requiresPayment) {
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
  }, [user, id, tier, purchase, navigate, toast]);

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

  if (isLoading) {
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
        <div>
          <p className="text-sm font-medium text-muted-foreground">Amount</p>
          <p className="text-2xl font-bold tracking-tight">
            {amountCents != null ? formatTastingPrice(amountCents) : '—'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button className="w-full" onClick={() => void startCheckout()} disabled={submitting || purchase.isPending}>
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
