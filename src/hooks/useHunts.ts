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

export function useTreasures(huntId: string | null) {
  return useQuery({
    queryKey: ['treasures', huntId],
    queryFn: async () => {
      if (!huntId) return [];

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
