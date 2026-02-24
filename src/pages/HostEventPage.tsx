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
 
   const [eventType, setEventType] = useState<'$17Coffee' | 'Event'>('Event');
   const [name, setName] = useState('');
   const [orgId, setOrgId] = useState('');
   const [eventDate, setEventDate] = useState('');
   const [eventTime, setEventTime] = useState('');
   const [location, setLocation] = useState('');
   const [description, setDescription] = useState('');
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
     
     // Always require: orgId, eventDate, eventType
     if (!orgId || !eventDate || !eventType) {
       toast({
         title: 'Missing fields',
         description: 'Please fill in the organization, event type, and date.',
         variant: 'destructive',
       });
       return;
     }

    // If eventType === 'Event', require name
    if (eventType === 'Event' && !name.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in the event name.',
        variant: 'destructive',
      });
      return;
    }

     // If eventType === '$17Coffee', require selectedOrg?.org_name
     const selectedOrg = orgs?.find(o => o.id === orgId);
     if (eventType === '$17Coffee' && !selectedOrg?.org_name) {
       toast({
         title: 'Missing fields',
         description: 'Please select an organization with a valid name.',
         variant: 'destructive',
       });
       return;
     }

     setIsSubmitting(true);

     try {
       // Build the final name
       const finalName =
         eventType === '$17Coffee'
           ? `${selectedOrg!.org_name} $17Coffee`
           : name.trim();

       const { error } = await supabase
         .from('events')
         .insert({
           name: finalName,
           event_type: eventType,
           event_date: eventDate,
           event_time: eventTime || null,
           location: location.trim() || null,
           description: description.trim() || null,
           created_by: user.id,
           org_id: orgId || null,
         });

       if (error) throw error;

       toast({
         title: 'Event Created!',
         description: 'Your event has been added to the calendar.',
       });

       navigate('/calendar');
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
               <Label htmlFor="eventType" className="text-sm font-semibold uppercase">
                 Event Type *
               </Label>
               <Select
                 value={eventType}
                onValueChange={(v) => {
                  const next = v as '$17Coffee' | 'Event';
                  setEventType(next);
                  if (next === '$17Coffee') setName('');
                }}
               >
                 <SelectTrigger className="h-12 text-lg">
                   <SelectValue placeholder="Select event type" />
                 </SelectTrigger>
                <SelectContent>
                  <SelectItem value="$17Coffee">$17Coffee</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                </SelectContent>
               </Select>
             </div>

           {eventType === 'Event' && (
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
               />
             </div>
           )}
 
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