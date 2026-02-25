 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { useAuth } from '@/contexts/AuthContext';
 import { useUserRole } from '@/hooks/useUserRole';
 import { useOrgs } from '@/hooks/useOrgs';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 import { ArrowLeft } from 'lucide-react';
 
 export default function HostEventPage() {
   const { user } = useAuth();
   const { canHostEvent, isLoading: roleLoading } = useUserRole();
   const { data: orgs, isLoading: orgsLoading } = useOrgs();
   const navigate = useNavigate();
   const { toast } = useToast();
 
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [ticketLimit, setTicketLimit] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
 
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
             Create Event
           </h1>
         </div>
         <div className="container px-4 py-8">
           <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
             <p className="font-bold uppercase mb-4">Please log in to create events.</p>
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
             <button
               onClick={() => navigate(-1)}
               className="absolute left-0 p-2"
             >
               <ArrowLeft className="w-6 h-6" />
             </button>
             <h1 className="text-2xl font-black uppercase tracking-tight">
               Create Event
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
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Always require: name, eventDate
    if (!name.trim() || !eventDate) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in the event name and date.',
        variant: 'destructive',
      });
      return;
    }

    const ticketLimitNum =
      ticketLimit.trim() === '' ? null : parseInt(ticketLimit, 10);
    if (
      ticketLimit.trim() !== '' &&
      (ticketLimitNum === null || isNaN(ticketLimitNum) || ticketLimitNum < 0)
    ) {
      toast({
        title: 'Invalid ticket limit',
        description: 'Ticket limit must be an integer >= 0.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: inserted, error } = await supabase
        .from('events')
        .insert({
          name: name.trim(),
          event_date: eventDate,
          event_time: eventTime || null,
          location: location.trim() || null,
          description: description.trim() || null,
          created_by: user.id,
          org_id: orgId || null,
          ticket_limit: ticketLimit.trim() === '' ? null : parseInt(ticketLimit, 10),
        })
        .select('id')
        .single();

       if (error) throw error;

       if (ticketLimitNum != null && ticketLimitNum > 0) {
         const { error: mintError } = await supabase.rpc('mint_event_tickets_atomic', {
           p_event_id: inserted.id,
           p_count: ticketLimitNum,
         });
         if (mintError) {
           console.error('Ticket minting failed:', mintError);
           toast({
             title: 'Event created, but tickets failed',
             description: mintError.message,
             variant: 'destructive',
           });
         }
       }

       toast({
         title: 'Event Created!',
         description: ticketLimitNum != null && ticketLimitNum > 0
           ? `Your event has been added. ${ticketLimitNum} tickets minted.`
           : 'Your event has been added to the calendar.',
       });

       navigate('/host/participants', { state: { eventId: inserted.id } });
     } catch (error: any) {
       console.error('Error creating event:', error);
       toast({
         title: 'Error',
         description: error.message || 'Failed to create event.',
         variant: 'destructive',
       });
     } finally {
       setIsSubmitting(false);
     }
   };
 
   return (
     <div className="min-h-screen bg-background pb-24">
       <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
         <div className="flex items-center justify-center relative">
           <button
             onClick={() => navigate(-1)}
             className="absolute left-0 p-2"
           >
             <ArrowLeft className="w-6 h-6" />
           </button>
           <h1 className="text-2xl font-black uppercase tracking-tight">
             Create Event
           </h1>
         </div>
       </div>
 
       <div className="container px-4 py-8">
         <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
             <div className="space-y-2">
               <Label htmlFor="org" className="text-sm font-semibold uppercase">
                 Organization *
               </Label>
               <Select
                 value={orgId}
                 onValueChange={setOrgId}
                 disabled={orgsLoading}
               >
                 <SelectTrigger className="h-12 text-lg">
                   <SelectValue placeholder={orgsLoading ? 'Loading...' : 'Select organization'} />
                 </SelectTrigger>
                 <SelectContent>
                   {orgs?.map((org) => (
                     <SelectItem key={org.id} value={org.id}>
                       {org.org_name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               {!orgsLoading && orgs?.length === 0 && (
                 <p className="text-sm text-muted-foreground">
                   No organizations available. Contact an admin to create one.
                 </p>
               )}
             </div>

           <div className="space-y-2">
             <Label htmlFor="name" className="text-sm font-semibold uppercase">
               Event Name *
             </Label>
             <Input
               id="name"
               type="text"
               value={name}
               onChange={(e) => setName(e.target.value)}
               placeholder="Morning Run"
               className="h-12 text-lg"
               required
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="eventDate" className="text-sm font-semibold uppercase">
               Date *
             </Label>
             <Input
               id="eventDate"
               type="date"
               value={eventDate}
               onChange={(e) => setEventDate(e.target.value)}
               className="h-12 text-lg"
               required
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="eventTime" className="text-sm font-semibold uppercase">
               Time (Optional)
             </Label>
             <Input
               id="eventTime"
               type="time"
               value={eventTime}
               onChange={(e) => setEventTime(e.target.value)}
               className="h-12 text-lg"
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="location" className="text-sm font-semibold uppercase">
               Location (Optional)
             </Label>
             <Input
               id="location"
               type="text"
               value={location}
               onChange={(e) => setLocation(e.target.value)}
               placeholder="Central Park"
               className="h-12 text-lg"
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="description" className="text-sm font-semibold uppercase">
               Description (Optional)
             </Label>
             <Textarea
               id="description"
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               placeholder="Join us for a morning run..."
               className="min-h-[100px] text-lg"
             />
           </div>

           <div className="space-y-2">
             <Label htmlFor="ticketLimit" className="text-sm font-semibold uppercase">
               Ticket limit
             </Label>
             <Input
               id="ticketLimit"
               type="number"
               min={0}
               value={ticketLimit}
               onChange={(e) => setTicketLimit(e.target.value)}
               placeholder="30"
               className="h-12 text-lg"
             />
             <p className="text-xs text-muted-foreground">
               How many tickets available for this event. Leave blank for unlimited (or 0 for none).
             </p>
           </div>
 
           <Button
             type="submit"
             className="w-full btn-run btn-run-yes"
             disabled={isSubmitting}
           >
             {isSubmitting ? 'Creating...' : 'Create Event'}
           </Button>
         </form>
       </div>
     </div>
   );
 }