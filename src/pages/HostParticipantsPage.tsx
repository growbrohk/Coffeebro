 import { useState, useEffect } from 'react';
 import { useNavigate, useLocation } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { useAuth } from '@/contexts/AuthContext';
 import { useUserRole } from '@/hooks/useUserRole';
 import { useHostEvents } from '@/hooks/useHostEvents';
 import { useEventParticipants } from '@/hooks/useEventParticipants';
 import { ArrowLeft } from 'lucide-react';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import { format, parseISO } from 'date-fns';
 
export default function HostParticipantsPage() {
   const { user } = useAuth();
   const { canHostEvent, isLoading: roleLoading } = useUserRole();
   const navigate = useNavigate();
   const location = useLocation();
   const [selectedEventId, setSelectedEventId] = useState<string | null>(
     (location.state as { eventId?: string })?.eventId || null
   );

   const { data: events, isLoading: eventsLoading } = useHostEvents();
   const { data: participants, isLoading: participantsLoading } = useEventParticipants(selectedEventId);

   // Update selected event if it's provided via navigation state
   useEffect(() => {
     const eventIdFromState = (location.state as { eventId?: string })?.eventId;
     if (eventIdFromState && eventIdFromState !== selectedEventId) {
       setSelectedEventId(eventIdFromState);
     }
   }, [location.state, selectedEventId]);
 
   // Loading state
   if (roleLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <div className="animate-pulse text-lg font-semibold">Loading...</div>
       </div>
     );
   }
 
   // Not logged in
   if (!user) {
     return (
       <div className="min-h-screen bg-background pb-24">
         <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
           <h1 className="text-2xl font-black uppercase tracking-tight text-center">
             View Participants
           </h1>
         </div>
         <div className="container px-4 py-8">
           <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
             <p className="font-bold uppercase mb-4">Please log in to view participants.</p>
             <Button onClick={() => navigate('/profile')} variant="outline" className="btn-run">
               Go to Login
             </Button>
           </div>
         </div>
       </div>
     );
   }
 
   // User doesn't have permission
   if (!canHostEvent) {
     return (
       <div className="min-h-screen bg-background pb-24">
         <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
           <div className="flex items-center justify-center relative">
             <button onClick={() => navigate(-1)} className="absolute left-0 p-2">
               <ArrowLeft className="w-6 h-6" />
             </button>
             <h1 className="text-2xl font-black uppercase tracking-tight">
               View Participants
             </h1>
           </div>
         </div>
         <div className="container px-4 py-8">
           <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
             <p className="font-bold uppercase mb-2">Access Required</p>
             <p className="text-sm mb-4">Please upgrade your access to host events.</p>
             <Button onClick={() => navigate('/profile')} variant="outline" className="btn-run">
               Back to Profile
             </Button>
           </div>
         </div>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background pb-24">
       <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
         <div className="flex items-center justify-center relative">
           <button onClick={() => navigate(-1)} className="absolute left-0 p-2">
             <ArrowLeft className="w-6 h-6" />
           </button>
           <h1 className="text-2xl font-black uppercase tracking-tight">
             View Participants
           </h1>
         </div>
       </div>
 
       <div className="container px-4 py-8 max-w-2xl mx-auto">
         {/* Event Selector */}
         <div className="space-y-2 mb-6">
           <label className="text-sm font-semibold uppercase">Select Event</label>
           <Select
             value={selectedEventId || ''}
             onValueChange={(value) => setSelectedEventId(value || null)}
             disabled={eventsLoading}
           >
             <SelectTrigger className="h-12 text-lg">
               <SelectValue placeholder={eventsLoading ? 'Loading events...' : 'Select an event'} />
             </SelectTrigger>
             <SelectContent>
               {events?.map((event) => (
                 <SelectItem key={event.id} value={event.id}>
                   {event.name} — {format(parseISO(event.event_date), 'MMM d, yyyy')}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
 
         {/* No events message */}
         {!eventsLoading && events?.length === 0 && (
           <div className="text-center p-6 bg-muted">
             <p className="text-muted-foreground font-medium">No events found.</p>
             <p className="text-sm text-muted-foreground mt-1">
               Create an event first to see participants.
             </p>
           </div>
         )}
 
         {/* Participants Table */}
         {selectedEventId && (
           <div className="mt-6">
             {participantsLoading ? (
               <div className="text-center p-6">
                 <div className="animate-pulse text-muted-foreground">Loading participants...</div>
               </div>
             ) : participants && participants.length > 0 ? (
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="font-bold uppercase">Participant</TableHead>
                     <TableHead className="font-bold uppercase">Registered At</TableHead>
                     <TableHead className="font-bold uppercase">Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {participants.map((p) => (
                     <TableRow key={p.id}>
                       <TableCell className="font-medium">
                         {p.username || p.user_id.slice(0, 8) + '...'}
                       </TableCell>
                       <TableCell>
                         {format(parseISO(p.created_at), 'MMM d, yyyy h:mm a')}
                       </TableCell>
                       <TableCell>
                         <span className={`px-2 py-1 text-xs font-semibold uppercase ${
                           p.status === 'registered' 
                             ? 'bg-primary text-primary-foreground' 
                             : 'bg-muted text-muted-foreground'
                         }`}>
                           {p.status}
                         </span>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             ) : (
               <div className="text-center p-6 bg-muted">
                 <p className="text-muted-foreground font-medium">No participants yet.</p>
               </div>
             )}
           </div>
         )}
       </div>
     </div>
   );
 }