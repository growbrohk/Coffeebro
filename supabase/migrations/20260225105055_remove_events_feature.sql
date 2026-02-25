-- Migration: Remove Events Feature
-- Drops all event-related tables, RPCs, functions, policies, and triggers

-- A1) Drop RPCs related to events
DROP FUNCTION IF EXISTS public.mint_event_tickets_atomic(uuid, int);
DROP FUNCTION IF EXISTS public.assign_event_ticket(uuid);

-- A2) Drop policies on event_tickets
DROP POLICY IF EXISTS "Hosts can manage event tickets" ON public.event_tickets;
DROP POLICY IF EXISTS "Users can view their assigned tickets" ON public.event_tickets;

-- A2) Drop policies on event_registrations
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can insert their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can update their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users and hosts can view accessible registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Hosts can view participants of their org events" ON public.event_registrations;

-- A2) Drop policies on events table
DROP POLICY IF EXISTS "Events are publicly readable" ON public.events;
DROP POLICY IF EXISTS "Hosts and admins can create events" ON public.events;
DROP POLICY IF EXISTS "Hosts can create events for their orgs" ON public.events;

-- Drop triggers on event_registrations
DROP TRIGGER IF EXISTS update_event_registrations_updated_at ON public.event_registrations;
DROP FUNCTION IF EXISTS public.update_event_registration_updated_at();

-- A3) Drop tables in correct order (child tables first)
DROP TABLE IF EXISTS public.event_tickets;
DROP TABLE IF EXISTS public.event_registrations;
DROP TABLE IF EXISTS public.events;

-- A4) Drop event-related functions
DROP FUNCTION IF EXISTS public.can_manage_event(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_view_event_participants(uuid, uuid);

-- Note: can_create_event_for_org function may be used elsewhere, so we keep it
-- Note: Other functions like has_role, is_org_host, can_view_org are used for coffee offers/vouchers, so we keep them
