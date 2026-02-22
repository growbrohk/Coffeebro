import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useUserRole';

/**
 * Hook to check if the current user can view participants for a specific event
 * Returns true if:
 * - User is super_admin
 * - User is run_club_host AND is assigned to the event's org in org_hosts
 */
export function useCanViewParticipants(eventId: string | null) {
  const { user } = useAuth();
  const { isSuperAdmin, isRunClubHost } = useUserRole();

  return useQuery({
    queryKey: ['can-view-participants', eventId, user?.id, isSuperAdmin, isRunClubHost],
    queryFn: async () => {
      if (!user || !eventId) return false;

      // Super admin can always view participants
      if (isSuperAdmin) return true;

      // Run club host needs to check if they're assigned to the event's org
      if (isRunClubHost) {
        // Get the event's org_id
        const { data: event, error: eventError } = await supabase
          .from('run_club_events')
          .select('org_id')
          .eq('id', eventId)
          .maybeSingle();

        if (eventError || !event || !event.org_id) return false;

        // Check if user is assigned to this org in org_hosts
        const { data: orgHost, error: orgHostError } = await supabase
          .from('org_hosts')
          .select('id')
          .eq('org_id', event.org_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (orgHostError) return false;
        return !!orgHost;
      }

      // Regular users cannot view participants
      return false;
    },
    enabled: !!user && !!eventId && (isSuperAdmin || isRunClubHost),
  });
}
