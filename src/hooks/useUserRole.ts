 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 
 type AppRole = 'super_admin' | 'run_club_host' | 'user';
 
 interface UserRoleData {
   role: AppRole | null;
   isSuperAdmin: boolean;
   isRunClubHost: boolean;
   canHostEvent: boolean;
   isLoading: boolean;
 }
 
 export function useUserRole(): UserRoleData {
   const { user } = useAuth();
 
   const { data: role, isLoading } = useQuery({
     queryKey: ['user-role', user?.id],
     queryFn: async () => {
       if (!user) return null;
 
       const { data, error } = await supabase
         .from('user_access')
         .select('role')
         .eq('user_id', user.id)
         .maybeSingle();
 
       if (error) {
         console.error('Error fetching user role:', error);
         return null;
       }
 
       return (data?.role as AppRole) || null;
     },
     enabled: !!user,
   });
 
   const isSuperAdmin = role === 'super_admin';
   const isRunClubHost = role === 'run_club_host';
   const canHostEvent = isSuperAdmin || isRunClubHost;
 
   return {
     role,
     isSuperAdmin,
     isRunClubHost,
     canHostEvent,
     isLoading,
   };
 }