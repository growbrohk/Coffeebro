import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ImageIcon, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAllTreasures,
  useHunts,
  useMyClaimedTreasureIds,
} from '@/hooks/useHunts';
import {
  primaryOfferByTreasureId,
  useTreasuresPrimaryOffers,
} from '@/hooks/useTreasuresPrimaryOffers';
import { pinKindForTreasure } from '@/lib/huntMapPinKind';
import type { HuntMapTreasure } from '@/types/huntMapTreasure';
import { VoucherCarouselRow } from '@/components/VoucherCarouselCards';

export default function CheckPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: hunts = [], isLoading: huntsLoading } = useHunts();
  const {
    data: rawTreasures = [],
    isLoading: treasuresLoading,
    isError: treasuresError,
  } = useAllTreasures(null, true);
  const { data: claimedIds } = useMyClaimedTreasureIds();

  const treasureIds = useMemo(() => rawTreasures.map((t) => t.id), [rawTreasures]);
  const { data: offerRows = [] } = useTreasuresPrimaryOffers(treasureIds);
  const offerByTreasure = useMemo(() => primaryOfferByTreasureId(offerRows), [offerRows]);

  const enrichedTreasures: HuntMapTreasure[] = useMemo(() => {
    return rawTreasures.map((t) => {
      const po = offerByTreasure.get(t.id);
      return {
        ...t,
        scanned: claimedIds?.has(t.id) ?? false,
        pinKind: pinKindForTreasure(po?.offer_type ?? null),
        offerTitle: po?.name ?? null,
        offerDescription: po?.description ?? null,
        offerType: po?.offer_type ?? null,
        orgName: po?.org_name ?? null,
        quantityLimit: po?.quantity_limit ?? null,
        campaignTitle: po?.campaign_title ?? null,
      };
    });
  }, [rawTreasures, offerByTreasure, claimedIds]);

  const filteredBySearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedTreasures.filter((t) => {
      if (!q) return true;
      const hay = [t.name, t.address, t.offerTitle, t.orgName].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [enrichedTreasures, searchQuery]);

  const voucherTreasures = useMemo(
    () =>
      filteredBySearch.filter(
        (t) => !t.scanned && (t.pinKind === 'grab' || t.pinKind === 'hunt')
      ),
    [filteredBySearch]
  );

  const cafeTreasures = useMemo(() => {
    const shops = filteredBySearch.filter((t) => t.pinKind === 'coffee_shop');
    const seen = new Set<string>();
    const deduped: HuntMapTreasure[] = [];
    for (const t of shops) {
      const key = `${t.orgName ?? t.name}|${t.address ?? ''}|${t.lat ?? ''}|${t.lng ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(t);
    }
    return deduped;
  }, [filteredBySearch]);

  const navigateToTreasure = (t: HuntMapTreasure) => {
    navigate(`/hunts/${t.hunt_id}/treasures/${t.id}`);
  };

  const isLoading = authLoading || huntsLoading || treasuresLoading;

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-28">
      <div
        className="px-5 pt-6"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">
          Ready to hunt some hidden gem?
        </h1>

        <div className="relative mt-6 flex items-center gap-3 rounded-full bg-muted/80 px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search where you wanna explore today..."
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            autoComplete="off"
          />
        </div>

        {isLoading ? (
          <div className="mt-16 flex justify-center">
            <div className="animate-pulse text-sm font-semibold text-muted-foreground">Loading…</div>
          </div>
        ) : treasuresError ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Couldn&apos;t load explore content. Pull to refresh or try again later.
          </p>
        ) : (
          <>
            <section className="mt-8">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold text-foreground">Vouchers</h2>
                <Link
                  to="/vouchers"
                  className="text-sm font-normal text-foreground underline-offset-2 hover:underline"
                >
                  See all
                </Link>
              </div>
              {voucherTreasures.length === 0 ? (
                <p className="rounded-2xl bg-card/80 px-4 py-6 text-center text-sm text-muted-foreground shadow-sm">
                  {hunts.length === 0
                    ? 'No vouchers yet. Check back when new hunts go live.'
                    : 'No matching vouchers. Try another search or open the map to hunt.'}
                </p>
              ) : (
                <VoucherCarouselRow
                  items={voucherTreasures}
                  onCta={navigateToTreasure}
                  onCardPress={navigateToTreasure}
                  showRedemptionPeriod={false}
                  className="-mx-1 pl-1 pr-5"
                />
              )}
            </section>

            <section className="mt-10">
              <h2 className="mb-3 text-lg font-bold text-foreground">Recommended Cafes</h2>
              {cafeTreasures.length === 0 ? (
                <p className="rounded-2xl bg-card/80 px-4 py-6 text-center text-sm text-muted-foreground shadow-sm">
                  No cafe spots to show yet.
                </p>
              ) : (
                <div
                  className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ scrollPaddingLeft: '0.25rem' }}
                >
                  {cafeTreasures.map((t) => {
                    const img = t.clue_image;
                    const title = t.orgName?.trim() || t.name;
                    const loc = t.address?.trim() || null;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => navigateToTreasure(t)}
                        className="w-[min(200px,calc((100vw-2.5rem-1.5rem)/1.35))] shrink-0 snap-start text-left"
                      >
                        <div className="aspect-[4/5] w-full overflow-hidden rounded-[20px] bg-muted shadow-sm">
                          {img ? (
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageIcon className="h-10 w-10 text-muted-foreground/35" strokeWidth={1.25} />
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-bold text-foreground line-clamp-2">{title}</p>
                        {loc ? (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{loc}</p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {!user ? (
              <p className="mt-8 text-center text-xs text-muted-foreground">
                <Link to="/profile" className="font-medium text-foreground underline">
                  Sign in
                </Link>{' '}
                to save vouchers and join hunts.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
