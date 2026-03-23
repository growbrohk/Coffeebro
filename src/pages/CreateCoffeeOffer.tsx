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
import { useHunt, useMyHunts } from '@/hooks/useHunts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { CoffeeTypeSelect } from '@/components/CoffeeTypeSelect';
import QRCode from 'react-qr-code';
import {
  OFFER_TYPES,
  type OfferTypeValue,
  validateOfferForm,
  buildHuntTimestamps,
} from '@/lib/offerForm';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const modeFromUrl = searchParams.get('mode');
  const huntIdFromUrl = searchParams.get('huntId');

  const [selectedMode, setSelectedMode] = useState<'calendar' | 'hunt'>(
    modeFromUrl === 'hunt' ? 'hunt' : 'calendar'
  );
  const [selectedHuntId, setSelectedHuntId] = useState<string>(huntIdFromUrl ?? '');

  const effectiveHuntId = huntIdFromUrl || selectedHuntId || '';
  const isHuntMode = selectedMode === 'hunt';
  const needsHuntPicker = isHuntMode && !effectiveHuntId;

  const { data: hunt, isLoading: huntLoading } = useHunt(
    isHuntMode && effectiveHuntId ? effectiveHuntId : null
  );
  const { data: myHunts = [], isLoading: myHuntsLoading } = useMyHunts();

  useEffect(() => {
    if (modeFromUrl === 'hunt' && huntIdFromUrl) {
      setSelectedMode('hunt');
      setSelectedHuntId(huntIdFromUrl);
    }
  }, [modeFromUrl, huntIdFromUrl]);

  const [orgId, setOrgId] = useState('');
  const [offerName, setOfferName] = useState('');
  const [offerType, setOfferType] = useState<OfferTypeValue>('free');
  const [quantityLimit, setQuantityLimit] = useState(17);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [redeemBeforeTime, setRedeemBeforeTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [coffeeTypes, setCoffeeTypes] = useState<string[]>([]);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastAutoLocationRef = useRef<string>('');
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

  // Hunt mode with huntId: validate hunt exists and user is creator
  if (isHuntMode && effectiveHuntId && huntLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading hunt...</div>
      </div>
    );
  }

  if (isHuntMode && effectiveHuntId && (!hunt || (user && hunt.created_by !== user.id))) {
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
            Create Coffee Offer
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
              Create Coffee Offer
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

    const selectedOrg = orgs?.find((o) => o.id === orgId);
    if (!selectedOrg?.org_name) {
      toast({
        title: 'Missing fields',
        description: 'Please select an organization with a valid name.',
        variant: 'destructive',
      });
      return;
    }

    const validation = validateOfferForm(
      isHuntMode ? 'hunt' : 'calendar',
      {
        orgId,
        offerName,
        location,
        lat,
        lng,
        date,
        startTime,
        endTime,
        redeemBeforeTime,
      },
      effectiveHuntId
    );

    if (!validation.valid) {
      toast({
        title: 'Missing fields',
        description: validation.message,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isHuntMode) {
        const qrCodeId = generateQrCodeId();
        const { starts_at: startsAtVal, ends_at: endsAtVal } = buildHuntTimestamps(
          date,
          startTime,
          endTime
        );

        const { data: treasure, error: treasureError } = await (supabase as any)
          .from('treasures')
          .insert({
            hunt_id: effectiveHuntId,
            qr_code_id: qrCodeId,
            name: offerName.trim(),
            address: location.trim() || null,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            claim_limit: quantityLimit,
            starts_at: startsAtVal,
            ends_at: endsAtVal,
          })
          .select('id')
          .single();

        if (treasureError) throw treasureError;

        const { error: offerError } = await (supabase as any).from('offers').insert({
          source_type: 'hunt',
          treasure_id: treasure.id,
          org_id: orgId,
          name: offerName.trim(),
          offer_type: offerType,
          description: description.trim() || null,
          quantity_limit: quantityLimit,
          location: location.trim() || null,
        });

        if (offerError) throw offerError;

        toast({ title: 'Treasure added!' });
        setCreatedTreasure({ qr_code_id: qrCodeId, name: offerName.trim() });
        setQrDialogOpen(true);
        queryClient.invalidateQueries({ queryKey: ['treasures', effectiveHuntId] });
        queryClient.invalidateQueries({ queryKey: ['all-treasures'] });
      } else {
        const { error } = await (supabase as any).from('offers').insert({
          source_type: 'calendar',
          name: offerName.trim(),
          offer_type: offerType,
          event_date: date,
          event_time: startTime.trim() || null,
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

  const submitButtonLabel = isHuntMode ? 'Add Treasure' : 'Create Coffee Offer';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <div className="flex items-center justify-center relative">
          <button
            onClick={() =>
              isHuntMode && effectiveHuntId
                ? navigate(`/host/hunts/${effectiveHuntId}`)
                : navigate(-1)
            }
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
            <Label htmlFor="offerMode" className="text-sm font-semibold uppercase">
              Offer Mode
            </Label>
            <Select
              value={selectedMode}
              onValueChange={(v) => {
                setSelectedMode(v as 'calendar' | 'hunt');
                if (v === 'calendar') {
                  setSearchParams({});
                  setSelectedHuntId('');
                }
              }}
            >
              <SelectTrigger className="h-12 text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Calendar</SelectItem>
                <SelectItem value="hunt">Hunt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isHuntMode && needsHuntPicker && (
            <div className="space-y-2">
              <Label htmlFor="hunt" className="text-sm font-semibold uppercase">
                Hunt *
              </Label>
              <Select
                value={selectedHuntId}
                onValueChange={setSelectedHuntId}
                disabled={myHuntsLoading}
              >
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue
                    placeholder={
                      myHuntsLoading
                        ? 'Loading hunts...'
                        : myHunts.length === 0
                          ? 'No hunts — create one first'
                          : 'Select a hunt'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {myHunts.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                      {h.status !== 'active' ? ` (${h.status})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {myHunts.length === 0 && !myHuntsLoading && (
                <p className="text-sm text-muted-foreground">
                  Create a hunt first from your profile, then add treasures here.
                </p>
              )}
            </div>
          )}

          {isHuntMode && !needsHuntPicker && hunt && (
            <p className="text-sm text-muted-foreground">
              Adding to: <span className="font-medium text-foreground">{hunt.name}</span>
            </p>
          )}

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
            <Label htmlFor="offerName" className="text-sm font-semibold uppercase">
              Offer Name *
            </Label>
            <Input
              id="offerName"
              value={offerName}
              onChange={(e) => setOfferName(e.target.value)}
              placeholder={isHuntMode ? 'Stop 1' : 'Stumptown Free Coffee'}
              className="h-12 text-lg"
              required
            />
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

          <div className="space-y-2">
            <Label htmlFor="quantityLimit" className="text-sm font-semibold uppercase">
              Quantity Limit
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
            <Label htmlFor="date" className="text-sm font-semibold uppercase">
              Date {!isHuntMode && '*'}
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 text-lg"
              required={!isHuntMode}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime" className="text-sm font-semibold uppercase">
              Start Time (HH:MM)
            </Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-12 text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime" className="text-sm font-semibold uppercase">
              End Time (HH:MM)
            </Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-12 text-lg"
            />
          </div>

          {!isHuntMode && (
            <div className="space-y-2">
              <Label htmlFor="redeemBeforeTime" className="text-sm font-semibold uppercase">
                Redeem Before (HH:MM)
              </Label>
              <Input
                id="redeemBeforeTime"
                type="time"
                value={redeemBeforeTime}
                onChange={(e) => setRedeemBeforeTime(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-semibold uppercase">
              Location {isHuntMode ? '*' : '(optional)'}
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

          {isHuntMode && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="lat" className="text-sm font-semibold uppercase">
                  Lat *
                </Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="40.7128"
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng" className="text-sm font-semibold uppercase">
                  Long *
                </Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-74.0060"
                  className="h-12"
                  required
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full btn-run btn-run-yes"
            disabled={
              isSubmitting ||
              (isHuntMode && !effectiveHuntId) ||
              (isHuntMode && (!location.trim() || !lat.trim() || !lng.trim()))
            }
          >
            {isSubmitting ? 'Creating...' : submitButtonLabel}
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
                    if (effectiveHuntId) navigate(`/host/hunts/${effectiveHuntId}`);
                  }}
                >
                  Back to Hunt
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setQrDialogOpen(false);
                    setCreatedTreasure(null);
                    setOfferName('');
                    setLocation('');
                    setLat('');
                    setLng('');
                    setDate('');
                    setStartTime('');
                    setEndTime('');
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
