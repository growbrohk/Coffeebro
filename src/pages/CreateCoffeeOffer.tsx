import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useHunt } from '@/hooks/useHunts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { CoffeeTypeSelect } from '@/components/CoffeeTypeSelect';
import QRCode from 'react-qr-code';

const OFFER_TYPES = [
  { value: 'free', label: 'Free' },
  { value: '$17coffee', label: '$17 Coffee' },
  { value: 'buy1get1free', label: 'Buy 1 Get 1 Free' },
] as const;

type OfferTypeValue = (typeof OFFER_TYPES)[number]['value'];

function isValidHHMM(value: string): boolean {
  if (!value) return true;
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function generateQrCodeId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'hunt_';
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default function CreateCoffeeOffer() {
  const { user } = useAuth();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: orgs, isLoading: orgsLoading } = useOrgs();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mode = searchParams.get('mode');
  const huntId = searchParams.get('huntId');
  const isHuntMode = mode === 'hunt' && !!huntId;

  const { data: hunt, isLoading: huntLoading } = useHunt(isHuntMode ? huntId : null);

  const [orgId, setOrgId] = useState('');
  const [offerType, setOfferType] = useState<OfferTypeValue>('free');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [redeemBeforeTime, setRedeemBeforeTime] = useState('');
  const [quantityLimit, setQuantityLimit] = useState(17);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [coffeeTypes, setCoffeeTypes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastAutoLocationRef = useRef<string>('');

  // Hunt mode fields
  const [treasureName, setTreasureName] = useState('');
  const [treasureAddress, setTreasureAddress] = useState('');
  const [treasureLat, setTreasureLat] = useState('');
  const [treasureLng, setTreasureLng] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [claimLimit, setClaimLimit] = useState('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [createdTreasure, setCreatedTreasure] = useState<{
    qr_code_id: string;
    name: string;
  } | null>(null);

  // Default org to first in allowed list when orgs load
  useEffect(() => {
    if (orgs && orgs.length > 0 && !orgId) {
      const first = orgs[0];
      setOrgId(first.id);
      const loc = first.location ?? '';
      setLocation(loc);
      if (isHuntMode) setTreasureAddress(loc);
      lastAutoLocationRef.current = loc;
    }
  }, [orgs, orgId, isHuntMode]);

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
      if (isHuntMode && (treasureAddress === '' || treasureAddress === lastAutoLocationRef.current)) {
        setTreasureAddress(newLoc);
      }
    } else {
      if (location === '' || location === lastAutoLocationRef.current) {
        setLocation('');
        lastAutoLocationRef.current = '';
      }
      if (isHuntMode && (treasureAddress === '' || treasureAddress === lastAutoLocationRef.current)) {
        setTreasureAddress('');
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

  // Hunt mode: validate hunt exists and user is creator
  if (isHuntMode && huntLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading hunt...</div>
      </div>
    );
  }

  if (isHuntMode && (!hunt || (user && hunt.created_by !== user.id))) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Hunt not found or access denied.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/host/hunts')}>
            Back to Hunts
          </Button>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
          <h1 className="text-2xl font-black uppercase tracking-tight text-center">
            {isHuntMode ? 'Create Coffee Treasure' : 'Create Coffee Offer'}
          </h1>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-4">Please log in to create.</p>
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
              {isHuntMode ? 'Create Coffee Treasure' : 'Create Coffee Offer'}
            </h1>
          </div>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-2">Access Required</p>
            <p className="text-sm mb-4">Please upgrade your access to create.</p>
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

    // Validate time format if provided (standalone only)
    if (!isHuntMode) {
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
    }

    const selectedOrg = orgs?.find((o) => o.id === orgId);
    if (!selectedOrg?.org_name) {
      toast({
        title: 'Missing fields',
        description: 'Please select an organization with a valid name.',
        variant: 'destructive',
      });
      return;
    }

    if (!orgId) {
      toast({
        title: 'Missing fields',
        description: 'Please select an organization.',
        variant: 'destructive',
      });
      return;
    }

    if (isHuntMode) {
      if (!treasureName.trim()) {
        toast({
          title: 'Missing fields',
          description: 'Treasure name is required.',
          variant: 'destructive',
        });
        return;
      }
      if (!huntId) return;
    } else {
      if (!eventDate) {
        toast({
          title: 'Missing fields',
          description: 'Please fill in the date.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isHuntMode) {
        // Hunt mode: create treasure + treasure_reward
        const qrCodeId = generateQrCodeId();
        const rewardTitle = `${selectedOrg.org_name} ${OFFER_TYPES.find((o) => o.value === offerType)?.label ?? offerType}`;

        const { data: treasure, error: treasureError } = await (supabase as any)
          .from('treasures')
          .insert({
            hunt_id: huntId,
            qr_code_id: qrCodeId,
            name: treasureName.trim(),
            address: treasureAddress.trim() || null,
            lat: treasureLat ? parseFloat(treasureLat) : null,
            lng: treasureLng ? parseFloat(treasureLng) : null,
            claim_limit: claimLimit ? parseInt(claimLimit, 10) : null,
            starts_at: startsAt ? (startsAt.length === 16 ? `${startsAt}:00` : startsAt) : null,
            ends_at: endsAt ? (endsAt.length === 16 ? `${endsAt}:00` : endsAt) : null,
          })
          .select('id')
          .single();

        if (treasureError) throw treasureError;

        const { error: rewardError } = await (supabase as any).from('treasure_reward').insert({
          treasure_id: treasure.id,
          title: rewardTitle,
          org_id: orgId,
          offer_type: offerType,
          description: description.trim() || null,
        });

        if (rewardError) throw rewardError;

        toast({ title: 'Treasure added!' });
        setCreatedTreasure({ qr_code_id: qrCodeId, name: treasureName.trim() });
        setQrDialogOpen(true);
        queryClient.invalidateQueries({ queryKey: ['treasures', huntId] });
        queryClient.invalidateQueries({ queryKey: ['all-treasures'] });
      } else {
        // Standalone mode: create coffee_offer
        const finalName = `${selectedOrg.org_name} ${OFFER_TYPES.find((o) => o.value === offerType)?.label ?? offerType}`;

        const { error } = await supabase.from('coffee_offers').insert({
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
      }
    } catch (error: any) {
      console.error('Error creating:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageTitle = isHuntMode ? 'Create Coffee Treasure' : 'Create Coffee Offer';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <div className="flex items-center justify-center relative">
          <button
            onClick={() => (isHuntMode && huntId ? navigate(`/host/hunts/${huntId}`) : navigate(-1))}
            className="absolute left-0 p-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black uppercase tracking-tight">{pageTitle}</h1>
        </div>
      </div>

      <div className="container px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
          <div className="space-y-2">
            <Label htmlFor="org" className="text-sm font-semibold uppercase">
              Organization *
            </Label>
            <Select value={orgId} onValueChange={handleOrgChange} disabled={orgsLoading}>
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
              onValueChange={(v) => setOfferType(v as OfferTypeValue)}
            >
              <SelectTrigger className="h-12 text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFFER_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {offerType === '$17coffee' && (
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
          )}

          {isHuntMode ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="treasureName" className="text-sm font-semibold uppercase">
                  Treasure Name *
                </Label>
                <Input
                  id="treasureName"
                  value={treasureName}
                  onChange={(e) => setTreasureName(e.target.value)}
                  placeholder="Stop 1"
                  className="h-12 text-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="treasureAddress" className="text-sm font-semibold uppercase">
                  Address (optional)
                </Label>
                <Input
                  id="treasureAddress"
                  value={treasureAddress}
                  onChange={(e) => setTreasureAddress(e.target.value)}
                  placeholder="123 Main St"
                  className="h-12 text-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold uppercase">Lat (optional)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={treasureLat}
                    onChange={(e) => setTreasureLat(e.target.value)}
                    placeholder="40.7128"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold uppercase">Lng (optional)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={treasureLng}
                    onChange={(e) => setTreasureLng(e.target.value)}
                    placeholder="-74.0060"
                    className="h-12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold uppercase">Claim limit (optional)</Label>
                <Input
                  type="number"
                  min={1}
                  value={claimLimit}
                  onChange={(e) => setClaimLimit(e.target.value)}
                  placeholder="Unlimited"
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold uppercase">Starts at (optional)</Label>
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold uppercase">Ends at (optional)</Label>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

          {!isHuntMode && (
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
          )}

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-semibold uppercase">
              Location (optional)
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
              Description (optional)
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
            {isSubmitting ? 'Creating...' : pageTitle}
          </Button>
        </form>
      </div>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{createdTreasure?.name}</DialogTitle>
          </DialogHeader>
          {createdTreasure && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-3 rounded-md">
                <QRCode value={createdTreasure.qr_code_id} size={200} />
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {createdTreasure.qr_code_id}
              </p>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setQrDialogOpen(false);
                    setCreatedTreasure(null);
                    if (huntId) navigate(`/host/hunts/${huntId}`);
                  }}
                >
                  Back to Hunt
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setQrDialogOpen(false);
                    setCreatedTreasure(null);
                    setTreasureName('');
                    setTreasureAddress('');
                    setTreasureLat('');
                    setTreasureLng('');
                    setStartsAt('');
                    setEndsAt('');
                    setClaimLimit('');
                  }}
                >
                  Add Another
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
