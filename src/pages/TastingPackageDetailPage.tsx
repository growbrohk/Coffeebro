import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTastingPackage, useMyTastingPackagePurchases } from '@/hooks/usePublishedTastingPackages';
import { Button } from '@/components/ui/button';
import { formatPackageDistricts, formatTastingPrice } from '@/types/tastingPackage';
import type { TastingPackageShop } from '@/types/tastingPackage';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pkg, isLoading } = useTastingPackage(id);
  const { data: purchases = [] } = useMyTastingPackagePurchases();

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

  const startPurchase = (tier: 'single' | 'duo') => {
    if (!user) {
      navigate('/profile');
      return;
    }
    if (!id) return;
    navigate(`/tasting-packages/${id}/checkout`, { state: { tier } });
  };

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
    <div className="min-h-screen bg-background pb-32">
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

        <TierSection title="Single includes" priceCents={pkg.single_price_cents} shops={singleShops} />
        <TierSection title="Duo includes" priceCents={pkg.duo_price_cents} shops={duoShops} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-4 py-4 backdrop-blur-sm">
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
    </div>
  );
}
