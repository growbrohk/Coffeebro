import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DiscoveryOrgRow = {
  id: string;
  org_name: string;
  preview_photo_url: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  district: string | null;
  mtr_station: string | null;
  sample_hunt_id: string | null;
  sample_treasure_id: string | null;
};

/** All orgs that have at least one active hunt (RPC; works without orgs-table SELECT). */
export function useDiscoveryOrgs() {
  return useQuery({
    queryKey: ['discovery-orgs'],
    queryFn: async (): Promise<DiscoveryOrgRow[]> => {
      const { data, error } = await supabase.rpc('get_discovery_orgs');
      if (error) throw error;
      return (data || []) as DiscoveryOrgRow[];
    },
    staleTime: 60_000,
  });
}
