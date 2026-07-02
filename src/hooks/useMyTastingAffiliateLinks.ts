import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TastingAffiliateLinkRow = {
  package_id: string;
  package_title: string;
  split_pct: number;
  ref_code: string;
};

export function useMyTastingAffiliateLinks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-tasting-affiliate-links', user?.id],
    queryFn: async (): Promise<TastingAffiliateLinkRow[]> => {
      const { data, error } = await supabase.rpc('get_my_tasting_affiliate_links');
      if (error) throw error;
      return (data ?? []).map((row) => ({
        package_id: row.package_id,
        package_title: row.package_title,
        split_pct: Number(row.split_pct),
        ref_code: row.ref_code,
      }));
    },
    enabled: Boolean(user),
  });
}
