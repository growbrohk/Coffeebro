import { useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTastingPackage, useMyTastingPackagePurchases } from '@/hooks/usePublishedTastingPackages';
import { Button } from '@/components/ui/button';
import { formatPackageDistricts, formatTastingPrice } from '@/types/tastingPackage';
import type { TastingPackageShop, TastingPackageTier } from '@/types/tastingPackage';
import {
  buildTastingCheckoutPath,
  captureAffiliateRef,
  resolveAffiliateRef,
  setPendingReturnTo,
} from '@/lib/tastingAffiliateRef';
import { AuthDialog } from '@/components/auth/AuthDialog';

function TierSection({
  title,
  priceCents,
  shops,
}: {
  title: string;
  priceCents: number;
  shops: TastingPackageShop[];
}) {
  if (shops.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">
        {title} — {formatTastingPrice(priceCents)}
      </h2>
      <ul className="space-y-3">
        {shops.map((shop) => (
          <li key={shop.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-semibold text-foreground">{shop.org_name ?? 'Coffee shop'}</p>
            {shop.location ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{shop.location}</p>
            ) : null}
            <ul className="mt-2 space-y-1">
              {shop.items.map((item) => (
                <li key={`${shop.id}-${item.portion_index}`} className="text-sm text-muted-foreground">
                  {shop.items.length > 1 ? `Drink ${item.portion_index}: ` : ''}
                  {item.item_name}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function TastingPackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pkg, isLoading } = useTastingPackage(id);
  const { data: purchases = [] } = useMyTastingPackagePurchases();
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingTier, setPendingTier] = useState<TastingPackageTier | null>(null);

  useEffect(() => {
    if (!id) return;
    const ref = searchParams.get('ref');
    if (ref) captureAffiliateRef(id, ref);
  }, [id, searchParams]);

  const checkoutPathForTier = useCallback(
    (tier: TastingPackageTier) => {
      if (!id) return '/explore';
      const ref = resolveAffiliateRef(id, searchParams.get('ref'));
      return buildTastingCheckoutPath(id, tier, ref);
    },
    [id, searchParams],
  );

  const proceedToCheckout = useCallback(
    (tier: TastingPackageTier) => {
      if (!id) return;
      navigate(checkoutPathForTier(tier), { state: { tier } });
    },
    [id, navigate, checkoutPathForTier],
  );

  const startPurchase = (tier: TastingPackageTier) => {
    if (!id) return;
    if (!user) {
      const returnPath = checkoutPathForTier(tier);
      setPendingReturnTo(returnPath);
      setPendingTier(tier);
      setAuthOpen(true);
      return;
    }
    proceedToCheckout(tier);
  };

  const handleAuthSuccess = () => {
    if (pendingTier) {
      proceedToCheckout(pendingTier);
      setPendingTier(null);
    }
    setAuthOpen(false);
  };

  const ownedTiers = useMemo(() => {
    const set = new Set<string>();
    for (const p of purchases) {
      if (p.package_id === id && p.status === 'minted') {
        set.add(p.tier);
      }
    }
    return set;
  }, [purchases, id]);

  const singleShops = useMemo(
    () => (pkg?.shops.filter((s) => s.tier === 'single') ?? []).sort((a, b) => a.sort_order - b.sort_order),
    [pkg],
  );
  const duoShops = useMemo(
    () => (pkg?.shops.filter((s) => s.tier === 'duo') ?? []).sort((a, b) => a.sort_order - b.sort_order),
    [pkg],
  );

  const authReturnPath = pendingTier ? checkoutPathForTier(pendingTier) : undefined;

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
        <Button className="mt-4" variant="outline" onClick={() => navigate('/explore')}>
          Back to Explore
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-48">
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-4 py-4">
        <button type="button" onClick={() => navigate(-1)} className="mr-2 p-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="min-w-0 truncate font-heading text-lg font-bold">{pkg.title}</h1>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        {pkg.cover_image_url ? (
          <img src={pkg.cover_image_url} alt="" className="h-48 w-full rounded-2xl object-cover" />
        ) : null}

        <div>
          <p className="text-sm font-medium text-muted-foreground">District</p>
          <p className="text-base font-semibold">{formatPackageDistricts(pkg.districts)}</p>
        </div>

        {pkg.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{pkg.description}</p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          All drinks in your package must be redeemed on the same day you choose at checkout, during each
          shop&apos;s opening hours.
        </p>

        <TierSection title="Single includes" priceCents={pkg.single_price_cents} shops={singleShops} />
        <TierSection title="Duo includes" priceCents={pkg.duo_price_cents} shops={duoShops} />
      </div>

      <div className="fixed bottom-[calc(var(--tab-nav-track-height)+env(safe-area-inset-bottom,0px))] left-1/2 z-[45] w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 pb-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          {singleShops.length > 0 ? (
            ownedTiers.has('single') ? (
              <Button variant="outline" className="w-full" onClick={() => navigate('/vouchers')}>
                View Single in wallet
              </Button>
            ) : (
              <Button className="w-full" onClick={() => startPurchase('single')}>
                Buy Single — {formatTastingPrice(pkg.single_price_cents)}
              </Button>
            )
          ) : null}
          {duoShops.length > 0 ? (
            ownedTiers.has('duo') ? (
              <Button variant="outline" className="w-full" onClick={() => navigate('/vouchers')}>
                View Duo in wallet
              </Button>
            ) : (
              <Button className="w-full" variant={singleShops.length > 0 ? 'outline' : 'default'} onClick={() => startPurchase('duo')}>
                Buy Duo — {formatTastingPrice(pkg.duo_price_cents)}
              </Button>
            )
          ) : null}
        </div>
      </div>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultSignUp
        title="Sign up to purchase"
        message="Create an account or log in to continue to checkout."
        returnToPath={authReturnPath}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
