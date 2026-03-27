import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { pinKindForTreasure } from '@/lib/huntMapPinKind';
import type { HuntMapTreasure } from '@/types/huntMapTreasure';

export interface PublicCalendarOfferRow {
  id: string;
  name: string;
  campaign_title: string | null;
  offer_type: string;
  description: string | null;
  location: string | null;
  event_date: string;
  event_time: string | null;
  quantity_limit: number;
  orgs: {
    org_name: string;
    lat: number | null;
    lng: number | null;
    location: string | null;
    preview_photo_url: string | null;
  } | null;
  preset_offers: { clue_image: string | null } | null;
}



function normalizeCalendarRow(row: any): PublicCalendarOfferRow {
  const org = Array.isArray(row.orgs) ? row.orgs[0] : row.orgs;
  const po = Array.isArray(row.preset_offers) ? row.preset_offers[0] : row.preset_offers;
  return { ...row, orgs: org ?? null, preset_offers: po ?? null };
}

function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Calendar listing offers shown on Check + global hunt map; coords prefer org lat/lng. */
export function mapCalendarOfferRowToHuntMapTreasure(row: PublicCalendarOfferRow): HuntMapTreasure {
  const org = row.orgs;
  const lat = org?.lat != null && Number.isFinite(Number(org.lat)) ? Number(org.lat) : null;
  const lng = org?.lng != null && Number.isFinite(Number(org.lng)) ? Number(org.lng) : null;
  const displayName = (row.campaign_title?.trim() || row.name?.trim() || 'Offer') as string;
  const address = row.location?.trim() || org?.location?.trim() || null;
  const po = row.preset_offers;

  return {
    id: `calendar-offer:${row.id}`,
    hunt_id: '',
    qr_code_id: `calendar:${row.id}`,
    name: displayName,
    description: row.description,
    lat,
    lng,
    address,
    sort_order: 0,
    scanned: false,
    pinKind: pinKindForTreasure(row.offer_type),
    offerTitle: row.name,
    offerDescription: row.description,
    offerType: row.offer_type,
    orgName: org?.org_name ?? null,
    orgPreviewPhotoUrl: org?.preview_photo_url ?? null,
    quantityLimit: row.quantity_limit ?? null,
    campaignTitle: row.campaign_title,
    clue_image: po?.clue_image ?? null,
    starts_at: null,
    ends_at: null,
    calendarOfferId: row.id,
    eventDate: row.event_date,
  };
}

export function usePublicCalendarOffersForExplore() {
  return useQuery({
    queryKey: ['public-calendar-offers-explore'],
    queryFn: async (): Promise<PublicCalendarOfferRow[]> => {
      const today = localYMD(new Date());
      const { data, error } = await (supabase as any)
        .from('offers')
        .select(
          `
          id,
          name,
          campaign_title,
          offer_type,
          description,
          location,
          event_date,
          event_time,
          quantity_limit,
          org_id,
          orgs ( org_name, lat, lng, location, preview_photo_url ),
          preset_offers ( clue_image )
        `
        )
        .eq('source_type', 'calendar')
        .gte('event_date', today)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return ((data || []) as any[]).map(normalizeCalendarRow);
    },
    staleTime: 60_000,
  });
}
