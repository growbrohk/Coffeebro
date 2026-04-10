import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface HostOffer {
  id: string;
  name: string;
  offer_type: string;
  source_type: 'calendar' | 'hunt';
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  created_at: string;
  hunt_name?: string;
  qr_code_id?: string;
}

export function useHostOffers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['host-offers', user?.id],
    queryFn: async (): Promise<HostOffer[]> => {
      if (!user) return [];

      const { data: accessRow } = await supabase
        .from('user_access')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      const isSuperAdmin = accessRow?.role === 'super_admin';

      const { data: staffRows } = await supabase
        .from('org_hosts')
        .select('org_id')
        .eq('user_id', user.id)
        .in('role', ['owner', 'host', 'manager']);
      const manageOrgIds = [...new Set((staffRows ?? []).map((r: { org_id: string }) => r.org_id))];

      let calendarQuery = (supabase as any)
        .from('offers')
        .select('id, name, offer_type, event_date, event_time, location, created_at')
        .eq('source_type', 'calendar')
        .order('event_date', { ascending: false });

      if (isSuperAdmin) {
        calendarQuery = calendarQuery;
      } else if (manageOrgIds.length > 0) {
        const inList = manageOrgIds.join(',');
        calendarQuery = calendarQuery.or(`created_by.eq.${user.id},org_id.in.(${inList})`);
      } else {
        calendarQuery = calendarQuery.eq('created_by', user.id);
      }

      const { data: calendarData, error: calendarError } = await calendarQuery;

      if (calendarError) throw calendarError;

      // 2. Hunt offers: via treasures -> hunts where created_by = user
      const { data: myHunts, error: huntsError } = await (supabase as any)
        .from('hunts')
        .select('id')
        .eq('created_by', user.id);

      if (huntsError) throw huntsError;
      const huntIds = (myHunts || []).map((h: { id: string }) => h.id);
      if (huntIds.length === 0) {
        const calendar = (calendarData || []).map((o: any) => ({
          ...o,
          source_type: 'calendar' as const,
          hunt_name: undefined,
        }));
        return calendar;
      }

      const { data: treasuresData, error: treasuresError } = await (supabase as any)
        .from('treasures')
        .select('id')
        .in('hunt_id', huntIds);

      if (treasuresError) throw treasuresError;
      const treasureIds = (treasuresData || []).map((t: { id: string }) => t.id);
      if (treasureIds.length === 0) {
        const calendar = (calendarData || []).map((o: any) => ({
          ...o,
          source_type: 'calendar' as const,
          hunt_name: undefined,
        }));
        return calendar;
      }

      const { data: huntOffersData, error: huntOffersError } = await (supabase as any)
        .from('offers')
        .select('id, name, offer_type, event_date, event_time, location, created_at, treasure_id')
        .eq('source_type', 'hunt')
        .in('treasure_id', treasureIds)
        .order('created_at', { ascending: false });

      if (huntOffersError) throw huntOffersError;

      // Get hunt names and qr_code_id for hunt offers
      const { data: huntNamesData } = await (supabase as any)
        .from('treasures')
        .select('id, qr_code_id, hunts(name)')
        .in('id', (huntOffersData || []).map((o: any) => o.treasure_id));

      const treasureToMeta = new Map<string, { huntName: string; qrCodeId: string }>();
      (huntNamesData || []).forEach((t: any) => {
        treasureToMeta.set(t.id, {
          huntName: t.hunts?.name ?? 'Hunt',
          qrCodeId: t.qr_code_id ?? '',
        });
      });

      const calendarOffers: HostOffer[] = (calendarData || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        offer_type: o.offer_type ?? 'free',
        source_type: 'calendar',
        event_date: o.event_date,
        event_time: o.event_time,
        location: o.location,
        created_at: o.created_at,
      }));

      const huntOffers: HostOffer[] = (huntOffersData || []).map((o: any) => {
        const meta = treasureToMeta.get(o.treasure_id);
        return {
          id: o.id,
          name: o.name,
          offer_type: o.offer_type ?? 'free',
          source_type: 'hunt' as const,
          event_date: o.event_date,
          event_time: o.event_time,
          location: o.location,
          created_at: o.created_at,
          hunt_name: meta?.huntName,
          qr_code_id: meta?.qrCodeId,
        };
      });

      return [...calendarOffers, ...huntOffers].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user,
  });
}
