import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Fetch another user's coffees for a specific month (authenticated users only)
 * Uses the daily_coffees_authed_read view which only allows authenticated access
 */
export function useUserMonthlyRuns(userId: string | undefined, year: number, month: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-coffees', userId, year, month],
    queryFn: async () => {
      if (!userId) return [];

      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // Use the authenticated-only view
      const { data, error } = await supabase
        .from('daily_coffees_authed_read')
        .select('user_id, coffee_date')
        .eq('user_id', userId)
        .gte('coffee_date', startDate)
        .lte('coffee_date', endDate);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!userId, // Only fetch if viewer is authenticated
  });
}

/**
 * Fetch a user profile by user_id
 */
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Search users by username (authenticated users only)
 */
export function useSearchUsers(query: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username')
        .ilike('username', `%${query}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && query.length >= 2, // Only search if authenticated and query is long enough
  });
}
