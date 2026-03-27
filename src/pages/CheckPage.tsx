import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAllTreasures,
  useHunts,
  useMyClaimedTreasureIds,
} from '@/hooks/useHunts';
import { useDiscoveryOrgs, type DiscoveryOrgRow } from '@/hooks/useDiscoveryOrgs';
import { useHuntsOrgMeta } from '@/hooks/useHuntsOrgMeta';
import {
  primaryOfferByTreasureId,
  useTreasuresPrimaryOffers,
} from '@/hooks/useTreasuresPrimaryOffers';
import {
  mapCalendarOfferRowToHuntMapTreasure,
  usePublicCalendarOffersForExplore,
} from '@/hooks/usePublicCalendarOffersForExplore';
import { pinKindForTreasure } from '@/lib/huntMapPinKind';
import type { HuntMapTreasure } from '@/types/huntMapTreasure';
import { VoucherCarouselRow } from '@/components/VoucherCarouselCards';

function discoveryOrgToCafeTreasure(row: DiscoveryOrgRow): HuntMapTreasure {
  return {
    id: row.id,
    hunt_id: row.sample_hunt_id ?? '',
    qr_code_id: `discovery:${row.id}`,
    name: row.org_name,
    description: null,
    lat: row.lat,
    lng: row.lng,
    address: row.location,
    sort_order: 0,
    clue_image: null,
    scanned: false,
    pinKind: 'coffee_shop',
    offerTitle: null,
    offerDescription: null,
    offerType: null,
    orgName: row.org_name,
    orgPreviewPhotoUrl: row.preview_photo_url,
    quantityLimit: null,
    campaignTitle: null,
    cafeDetailTreasureId: row.sample_treasure_id,
  };
}

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
  const huntIdsForOrg = useMemo(
    () => [...new Set(rawTreasures.map((t) => t.hunt_id))],
    [rawTreasures]
  );
  const { data: huntOrgMap = new Map(), isPending: huntOrgMetaLoading } =
    useHuntsOrgMeta(huntIdsForOrg);
  const { data: discoveryOrgs = [], isPending: discoveryOrgsLoading } = useDiscoveryOrgs();
  const { data: calendarOfferRows = [], isPending: calendarOffersLoading } =
    usePublicCalendarOffersForExplore();
  const { data: offerRows = [] } = useTreasuresPrimaryOffers(treasureIds);
  const offerByTreasure = useMemo(() => primaryOfferByTreasureId(offerRows), [offerRows]);

  const enrichedTreasures: HuntMapTreasure[] = useMemo(() => {
    return rawTreasures.map((t) => {
      const po = offerByTreasure.get(t.id);
      const huntOrg = huntOrgMap.get(t.hunt_id);
      return {
        ...t,
        scanned: claimedIds?.has(t.id) ?? false,
        pinKind: pinKindForTreasure(po?.offer_type ?? null),
        offerTitle: po?.name ?? null,
        offerDescription: po?.description ?? null,
        offerType: po?.offer_type ?? null,
        orgName: po?.org_name ?? huntOrg?.org_name ?? null,
        orgPreviewPhotoUrl: po?.org_preview_photo_url ?? huntOrg?.preview_photo_url ?? null,
        quantityLimit: po?.quantity_limit ?? null,
        campaignTitle: po?.campaign_title ?? null,
        clue_image: po?.preset_clue_image ?? t.clue_image ?? null,
      };
    });
  }, [rawTreasures, offerByTreasure, claimedIds, huntOrgMap]);

  const filteredBySearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedTreasures.filter((t) => {
      if (!q) return true;
      const hay = [t.name, t.address, t.offerTitle, t.orgName].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [enrichedTreasures, searchQuery]);

  const calendarAsTreasures = useMemo(
    () => (calendarOfferRows || []).map(mapCalendarOfferRowToHuntMapTreasure),
    [calendarOfferRows]
  );

  const filteredCalendarBySearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return calendarAsTreasures.filter((t) => {
      if (!q) return true;
      const hay = [t.name, t.address, t.offerTitle, t.orgName, t.campaignTitle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [calendarAsTreasures, searchQuery]);

  const voucherTreasures = useMemo(() => {
    const hunt = filteredBySearch.filter((t) => !t.scanned);
    return [...hunt, ...filteredCalendarBySearch];
  }, [filteredBySearch, filteredCalendarBySearch]);

  /** All orgs with an active hunt (server RPC), filtered by search. */
  const cafeTreasures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = !q
      ? discoveryOrgs
      : discoveryOrgs.filter((r) => {
          const hay = [r.org_name, r.location, r.district, r.mtr_station]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        });
    return rows.map(discoveryOrgToCafeTreasure);
  }, [discoveryOrgs, searchQuery]);

  const navigateToTreasure = (t: HuntMapTreasure) => {
    if (t.calendarOfferId) {
      navigate('/calendar');
      return;
    }
    if (t.cafeDetailTreasureId && t.hunt_id) {
      navigate(`/hunts/${t.hunt_id}/treasures/${t.cafeDetailTreasureId}`);
      return;
    }
    if (t.hunt_id) {
      navigate(`/hunts/${t.hunt_id}/map`);
      return;
    }
    navigate('/hunts');
  };

  const isLoading =
    authLoading ||
    huntsLoading ||
    treasuresLoading ||
    huntOrgMetaLoading ||
    discoveryOrgsLoading ||
    calendarOffersLoading;

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
                  {hunts.length === 0 && calendarAsTreasures.length === 0
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
                <VoucherCarouselRow
                  variant="cafe"
                  items={cafeTreasures}
                  onCta={navigateToTreasure}
                  onCardPress={navigateToTreasure}
                  showRedemptionPeriod={false}
                  className="-mx-1 pl-1 pr-5"
                />
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
