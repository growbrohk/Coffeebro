import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: 'registered' | 'cancel';
  created_at: string;
  updated_at: string;
}

// Fetch registration for a specific event
export function useEventRegistration(eventId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['eventRegistration', eventId, user?.id],
    queryFn: async () => {
      if (!eventId || !user) return null;
      
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as EventRegistration | null;
    },
    enabled: !!eventId && !!user,
  });
}

// Fetch all registrations for the current user (for calendar display)
export function useUserEventRegistrations() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['userEventRegistrations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'registered');
      
      if (error) throw error;
      return data as EventRegistration[];
    },
    enabled: !!user,
  });
}

// Register for an event
export function useRegisterForEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ eventId, existingRegistrationId }: { eventId: string; existingRegistrationId?: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      if (existingRegistrationId) {
        // Update existing registration back to 'registered'
        const { data, error } = await supabase
          .from('event_registrations')
          .update({ status: 'registered' })
          .eq('id', existingRegistrationId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new registration
        const { data, error } = await supabase
          .from('event_registrations')
          .insert({
            event_id: eventId,
            user_id: user.id,
            status: 'registered',
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventRegistration', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['userEventRegistrations'] });
    },
  });
}

// Cancel registration
export function useCancelRegistration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ registrationId, eventId }: { registrationId: string; eventId: string }) => {
      const { data, error } = await supabase
        .from('event_registrations')
        .update({ status: 'cancel' })
        .eq('id', registrationId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventRegistration', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['userEventRegistrations'] });
    },
  });
}
