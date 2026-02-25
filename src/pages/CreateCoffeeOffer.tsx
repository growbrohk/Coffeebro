import { useState, useRef, useEffect } from 'react';
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
import { CoffeeTypeSelect } from '@/components/CoffeeTypeSelect';

function isValidHHMM(value: string): boolean {
  if (!value) return true;
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export default function CreateCoffeeOffer() {
  const { user } = useAuth();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: orgs, isLoading: orgsLoading } = useOrgs();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [orgId, setOrgId] = useState('');
  const [offerType, setOfferType] = useState<'$17coffee'>('$17coffee');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [redeemBeforeTime, setRedeemBeforeTime] = useState('');
  const [quantityLimit, setQuantityLimit] = useState(17);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [coffeeTypes, setCoffeeTypes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastAutoLocationRef = useRef<string>('');

  // Default org to first in allowed list when orgs load
  useEffect(() => {
    if (orgs && orgs.length > 0 && !orgId) {
      const first = orgs[0];
      setOrgId(first.id);
      const loc = first.location ?? '';
      setLocation(loc);
      lastAutoLocationRef.current = loc;
    }
  }, [orgs, orgId]);

  // Auto-fill location from org when org changes (do not overwrite user edits)
  const handleOrgChange = (newOrgId: string) => {
    const newOrg = orgs?.find((o) => o.id === newOrgId);
    setOrgId(newOrgId);

    if (newOrg?.location) {
      const newLoc = newOrg.location;
      if (location === '' || location === lastAutoLocationRef.current) {
        setLocation(newLoc);
        lastAutoLocationRef.current = newLoc;
      }
    } else {
      if (location === '' || location === lastAutoLocationRef.current) {
        setLocation('');
        lastAutoLocationRef.current = '';
      }
    }
  };

  const handleLocationChange = (value: string) => setLocation(value);

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
            Create Coffee Offer
          </h1>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-4">Please log in to create coffee offers.</p>
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
              Create Coffee Offer
            </h1>
          </div>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-2">Access Required</p>
            <p className="text-sm mb-4">Please upgrade your access to create coffee offers.</p>
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
    
    // Validate time format if provided
    if (eventTime && !isValidHHMM(eventTime)) {
      toast({
        title: 'Invalid time',
        description: 'Start reg time must be HH:MM (24-hour, e.g. 09:00).',
        variant: 'destructive',
      });
      return;
    }
    if (redeemBeforeTime && !isValidHHMM(redeemBeforeTime)) {
      toast({
        title: 'Invalid time',
        description: 'Redeem before must be HH:MM (24-hour, e.g. 12:00).',
        variant: 'destructive',
      });
      return;
    }

    // Always require: orgId, eventDate
    if (!orgId || !eventDate) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in the organization and date.',
        variant: 'destructive',
      });
      return;
    }

    const selectedOrg = orgs?.find(o => o.id === orgId);
    if (!selectedOrg?.org_name) {
      toast({
        title: 'Missing fields',
        description: 'Please select an organization with a valid name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build the name from organization and offer type
      const finalName = `${selectedOrg.org_name} ${offerType}`;

      const { error } = await supabase
        .from('coffee_offers')
        .insert({
          name: finalName,
          offer_type: offerType,
          event_date: eventDate,
          event_time: eventTime.trim() || null,
          redeem_before_time: redeemBeforeTime.trim() || null,
          location: location.trim() || null,
          description: description.trim() || null,
          quantity_limit: quantityLimit,
          coffee_types: coffeeTypes.length > 0 ? coffeeTypes : null,
          created_by: user.id,
          org_id: orgId,
        });

      if (error) throw error;

      toast({
        title: 'Coffee Offer Created!',
        description: 'Your coffee offer has been added to the calendar.',
      });

      navigate('/calendar');
    } catch (error: any) {
      console.error('Error creating coffee offer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create coffee offer.',
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
            Create Coffee Offer
          </h1>
        </div>
      </div>

      <div className="container px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
            <div className="space-y-2">
              <Label htmlFor="org" className="text-sm font-semibold uppercase">
                Organization
              </Label>
              <Select
                value={orgId}
                onValueChange={handleOrgChange}
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
              <Label htmlFor="offerType" className="text-sm font-semibold uppercase">
                Offer Type *
              </Label>
              <Select
                value={offerType}
                onValueChange={(v) => setOfferType(v as '$17coffee')}
              >
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="$17coffee">$17coffee</SelectItem>
                </SelectContent>
              </Select>
            </div>

          <div className="space-y-2">
            <CoffeeTypeSelect
              value={coffeeTypes}
              onChange={setCoffeeTypes}
              maxSelected={2}
              label="Coffee type (choose up to 2)"
              onMaxReached={() => {
                toast({
                  title: 'Maximum reached',
                  description: 'You can choose up to 2 coffee types',
                  variant: 'destructive',
                });
              }}
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
              Start reg time (HH:MM)
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
            <Label htmlFor="redeemBeforeTime" className="text-sm font-semibold uppercase">
              Redeem before (HH:MM)
            </Label>
            <Input
              id="redeemBeforeTime"
              type="time"
              value={redeemBeforeTime}
              onChange={(e) => setRedeemBeforeTime(e.target.value)}
              className="h-12 text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantityLimit" className="text-sm font-semibold uppercase">
              Quantity limit
            </Label>
            <Input
              id="quantityLimit"
              type="number"
              min={1}
              value={quantityLimit}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setQuantityLimit(isNaN(v) ? 17 : Math.max(1, v));
              }}
              className="h-12 text-lg"
            />
            <p className="text-xs text-muted-foreground">Default: 17</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-semibold uppercase">
              Location (Optional)
            </Label>
            <Input
              id="location"
              type="text"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
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
            {isSubmitting ? 'Creating...' : 'Create Coffee Offer'}
          </Button>
        </form>
      </div>
    </div>
  );
}
