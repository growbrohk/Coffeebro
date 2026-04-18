import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type OrgClaimSpotRow = {
  id: string;
  org_id: string;
  label: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  google_maps_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const orgClaimSpotsQueryKey = (orgId: string | undefined) =>
  ['org-claim-spots', orgId] as const;

export function useOrgClaimSpots(orgId: string | undefined) {
  return useQuery({
    queryKey: orgClaimSpotsQueryKey(orgId),
    enabled: Boolean(orgId),
    queryFn: async (): Promise<OrgClaimSpotRow[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('org_claim_spots')
        .select('*')
        .eq('org_id', orgId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrgClaimSpotRow[];
    },
    staleTime: 15_000,
  });
}

export function useCreateClaimSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<'org_claim_spots'>) => {
      const { data, error } = await supabase
        .from('org_claim_spots')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as OrgClaimSpotRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: orgClaimSpotsQueryKey(row.org_id) });
    },
  });
}

export function useUpdateClaimSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; orgId: string; patch: TablesUpdate<'org_claim_spots'> }) => {
      const { data, error } = await supabase
        .from('org_claim_spots')
        .update(args.patch)
        .eq('id', args.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as OrgClaimSpotRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: orgClaimSpotsQueryKey(row.org_id) });
    },
  });
}

export function useDeleteClaimSpot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; orgId: string }) => {
      const { error } = await supabase.from('org_claim_spots').delete().eq('id', args.id);
      if (error) throw error;
      return args;
    },
    onSuccess: (args) => {
      qc.invalidateQueries({ queryKey: orgClaimSpotsQueryKey(args.orgId) });
    },
  });
}
