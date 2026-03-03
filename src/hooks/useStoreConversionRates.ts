import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoreConversionRate {
  store_id: string;
  starts: number;
  signups: number;
  conversion_rate: number;
}

export function useStoreConversionRates(orgIds: string[]) {
  return useQuery({
    queryKey: ['store-conversion-rates', orgIds],
    queryFn: async (): Promise<StoreConversionRate[]> => {
      if (orgIds.length === 0) return [];
      const { data, error } = await supabase.rpc('get_store_conversion_rates', {
        p_org_ids: orgIds,
      });
      if (error) throw error;
      return (data ?? []).map((row: { store_id: string; starts: number; signups: number; conversion_rate: number }) => ({
        store_id: row.store_id,
        starts: Number(row.starts),
        signups: Number(row.signups),
        conversion_rate: Number(row.conversion_rate),
      }));
    },
    enabled: orgIds.length > 0,
  });
}
