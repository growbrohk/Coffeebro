import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyTicketForEvent, type EventTicket } from './useEventTickets';

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: 'registered' | 'cancel';
  created_at: string;
  updated_at: string;
}

// Fetch registration for a specific event (now checks tickets)
export function useEventRegistration(eventId: string | undefined) {
  const { data: ticket, isLoading, error } = useMyTicketForEvent(eventId || null);
  
  // Return ticket as registration for backward compatibility
  return {
    data: ticket ? {
      id: ticket.id,
      event_id: ticket.event_id,
      user_id: ticket.assigned_to || '',
      status: ticket.status === 'active' ? 'registered' as const : 'cancel' as const,
      created_at: ticket.created_at,
      updated_at: ticket.created_at,
      ticket_code: ticket.code,
    } : null,
    isLoading,
    error,
  };
}

// Fetch all registrations for the current user (now checks tickets)
export function useUserEventRegistrations() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['userEventRegistrations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('event_tickets')
        .select('id, event_id, code, status, assigned_to, created_at')
        .eq('assigned_to', user.id)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Transform to EventRegistration format for backward compatibility
      return (data || []).map(ticket => ({
        id: ticket.id,
        event_id: ticket.event_id,
        user_id: ticket.assigned_to || '',
        status: 'registered' as const,
        created_at: ticket.created_at,
        updated_at: ticket.created_at,
        ticket_code: ticket.code,
      })) as (EventRegistration & { ticket_code: string })[];
    },
    enabled: !!user,
  });
}

// Register for an event (now assigns a ticket)
export function useRegisterForEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ eventId, existingRegistrationId }: { eventId: string; existingRegistrationId?: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      if (existingRegistrationId) {
        // Reactivate existing ticket
        const { data, error } = await supabase
          .from('event_tickets')
          .update({ status: 'active' })
          .eq('id', existingRegistrationId)
          .eq('assigned_to', user.id)
          .select()
          .single();
        
        if (error) throw error;
        return { ...data, ticket_code: data.code };
      } else {
        // Assign a new ticket
        const { data, error } = await supabase.rpc('assign_event_ticket', {
          p_event_id: eventId,
        });
        
        if (error) {
          const errorMessage = error.message || 'Failed to register';
          throw new Error(errorMessage);
        }
        
        if (!data || data.length === 0) {
          throw new Error('No ticket assigned');
        }
        
        return { id: data[0].ticket_id, ticket_code: data[0].code };
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventRegistration', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-ticket', 'my', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['userEventRegistrations'] });
      queryClient.invalidateQueries({ queryKey: ['event-tickets', variables.eventId] });
    },
  });
}

// Cancel registration (now voids the ticket)
export function useCancelRegistration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ registrationId, eventId }: { registrationId: string; eventId: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      // Void the ticket and clear assignment
      const { data, error } = await supabase
        .from('event_tickets')
        .update({ 
          status: 'void',
          assigned_to: null,
        })
        .eq('id', registrationId)
        .eq('assigned_to', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventRegistration', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-ticket', 'my', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['userEventRegistrations'] });
      queryClient.invalidateQueries({ queryKey: ['event-tickets', variables.eventId] });
    },
  });
}
