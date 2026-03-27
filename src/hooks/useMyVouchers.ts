import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OFFER_TYPE_LABELS } from '@/lib/offerTypes';

export interface MyVoucher {
  id: string;
  code: string;
  status: 'active' | 'redeemed' | 'expired' | 'refunded';
  source_type: 'coffee_offer' | 'hunt_stop';
  created_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
  /** Campaign display: campaign_title || offer name */
  title: string;
  org_name?: string;
  offer_type?: string;
  description?: string | null;
  location?: string | null;
  event_date?: string | null;
  thumbnail_url?: string | null;
}

export function formatVoucherRedemptionPeriod(
  expiresAt: string | null | undefined,
  eventDate: string | null | undefined
): string {
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
  if (eventDate) {
    const d = new Date(eventDate + 'T12:00:00');
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
  return '—';
}

export function useMyVouchers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vouchers', 'my', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: vouchers, error } = await (supabase as any)
        .from('vouchers')
        .select(`
          id,
          code,
          status,
          source_type,
          created_at,
          redeemed_at,
          expires_at,
          offer_id,
          org_id,
          orgs(org_name),
          offers(
            name,
            offer_type,
            description,
            location,
            campaign_title,
            event_date,
            treasure_id,
            treasures ( clue_image, name )
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const result: MyVoucher[] = (vouchers || []).map((v: any) => {
        const offer = v.offers;
        const campaignTitle =
          (offer?.campaign_title?.trim() || offer?.name?.trim() || 'Voucher') as string;
        let offerType: string | undefined;
        if (offer?.offer_type) {
          offerType = OFFER_TYPE_LABELS[offer.offer_type] ?? offer.offer_type;
        }
        const tr = offer?.treasures;
        const treasure = Array.isArray(tr) ? tr[0] : tr;
        const thumb = treasure?.clue_image as string | null | undefined;
        return {
          id: v.id,
          code: v.code,
          status: v.status,
          source_type: v.source_type,
          created_at: v.created_at,
          redeemed_at: v.redeemed_at,
          expires_at: v.expires_at,
          title: campaignTitle,
          org_name: v.orgs?.org_name,
          offer_type: offerType,
          description: offer?.description ?? null,
          location: offer?.location ?? null,
          event_date: offer?.event_date ?? null,
          thumbnail_url: thumb || null,
        };
      });

      return result;
    },
    enabled: !!user,
  });
}
