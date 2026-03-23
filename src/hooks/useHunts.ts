import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Hunt {
  id: string;
  org_id: string;
  created_by: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'ended';
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface Treasure {
  id: string;
  hunt_id: string;
  qr_code_id: string;
  name: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  sort_order: number;
  claim_limit?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  clue_image?: string | null;
  scanned?: boolean;
}

export function useMyClaimedTreasureIds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['hunt-claims', user?.id],
    queryFn: async (): Promise<Set<string>> => {
      if (!user) return new Set();

      const { data, error } = await (supabase as any)
        .from('hunt_claims')
        .select('treasure_id')
        .eq('user_id', user.id);

      if (error) throw error;
      const ids = (data || []).map((r: { treasure_id: string }) => r.treasure_id);
      return new Set(ids);
    },
    enabled: !!user,
  });
}

export function useMyHunts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-hunts', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from('hunts')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Hunt[];
    },
    enabled: !!user,
  });
}

export function useHunts() {
  return useQuery({
    queryKey: ['hunts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('hunts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Hunt[];
    },
  });
}

export function useHunt(huntId: string | null) {
  return useQuery({
    queryKey: ['hunt', huntId],
    queryFn: async () => {
      if (!huntId) return null;

      const { data, error } = await (supabase as any)
        .from('hunts')
        .select('*')
        .eq('id', huntId)
        .single();

      if (error) throw error;
      return data as Hunt;
    },
    enabled: !!huntId,
  });
}

export function useTreasure(treasureId: string | null, huntId?: string | null) {
  return useQuery({
    queryKey: ['treasure', treasureId, huntId],
    queryFn: async () => {
      if (!treasureId) return null;

      let query = (supabase as any)
        .from('treasures')
        .select('*')
        .eq('id', treasureId);

      if (huntId) {
        query = query.eq('hunt_id', huntId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data as Treasure;
    },
    enabled: !!treasureId,
  });
}

export function useTreasures(huntId: string | null, activeOnly = true) {
  return useQuery({
    queryKey: ['treasures', huntId, activeOnly],
    queryFn: async () => {
      if (!huntId) return [];

      if (activeOnly) {
        const { data, error } = await (supabase as any).rpc('get_active_treasures', {
          p_hunt_id: huntId,
        });
        if (!error) return (data || []) as Treasure[];
        // Fallback to direct select if RPC not yet available (migrations not run)
      }

      const { data, error } = await (supabase as any)
        .from('treasures')
        .select('*')
        .eq('hunt_id', huntId)
        .order('sort_order');

      if (error) throw error;
      return (data || []) as Treasure[];
    },
    enabled: !!huntId,
  });
}

export function useAllTreasures(huntId: string | null, enabled = true, activeOnly = true) {
  return useQuery({
    queryKey: ['all-treasures', huntId, activeOnly],
    enabled,
    queryFn: async () => {
      if (activeOnly) {
        const { data, error } = await (supabase as any).rpc('get_active_treasures', {
          p_hunt_id: huntId,
        });
        if (!error) return (data || []) as Treasure[];
        // Fallback to direct select if RPC not yet available (migrations not run)
      }

      if (huntId) {
        const { data, error } = await (supabase as any)
          .from('treasures')
          .select('*')
          .eq('hunt_id', huntId)
          .order('sort_order');
        if (error) throw error;
        return (data || []) as Treasure[];
      }

      const { data: hunts, error: huntsError } = await (supabase as any)
        .from('hunts')
        .select('id')
        .eq('status', 'active');
      if (huntsError) throw huntsError;
      const huntIds = (hunts || []).map((h: { id: string }) => h.id);
      if (huntIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from('treasures')
        .select('*')
        .in('hunt_id', huntIds)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Treasure[];
    },
  });
}

export function useIsParticipant(huntId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['hunt-participant', huntId, user?.id],
    queryFn: async () => {
      if (!huntId || !user) return false;

      const { data, error } = await (supabase as any)
        .from('hunt_participants')
        .select('hunt_id')
        .eq('hunt_id', huntId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!huntId && !!user,
  });
}

export function useJoinHunt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (huntId: string) => {
      if (!user) throw new Error('Sign in required');

      const { error } = await (supabase as any)
        .from('hunt_participants')
        .upsert({ hunt_id: huntId, user_id: user.id }, { onConflict: 'hunt_id,user_id' });

      if (error) throw error;
      return huntId;
    },
    onSuccess: (huntId) => {
      queryClient.invalidateQueries({ queryKey: ['hunt-participant', huntId] });
      queryClient.invalidateQueries({ queryKey: ['hunt', huntId] });
    },
  });
}
