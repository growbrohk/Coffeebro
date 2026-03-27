import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type HuntOrgMeta = {
  org_name: string | null;
  preview_photo_url: string | null;
};

/** Org listing fields for treasures that only have hunt context (e.g. coffee_shop without a primary offer row). */
export function useHuntsOrgMeta(huntIds: string[]) {
  const sorted = [...new Set(huntIds)].filter(Boolean).sort();
  const key = sorted.join(',');

  return useQuery({
    queryKey: ['hunts-org-meta', key],
    queryFn: async (): Promise<Map<string, HuntOrgMeta>> => {
      if (sorted.length === 0) return new Map();

      const { data, error } = await (supabase as any)
        .from('hunts')
        .select('id, orgs(org_name, preview_photo_url)')
        .in('id', sorted);

      if (error) throw error;

      const map = new Map<string, HuntOrgMeta>();
      for (const row of data || []) {
        const org = row.orgs as { org_name: string; preview_photo_url: string | null } | null;
        map.set(row.id, {
          org_name: org?.org_name ?? null,
          preview_photo_url: org?.preview_photo_url ?? null,
        });
      }
      return map;
    },
    enabled: sorted.length > 0,
    staleTime: 60_000,
  });
}
