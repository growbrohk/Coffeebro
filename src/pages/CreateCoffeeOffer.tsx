import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface PresetOffer {
  id: string;
  org_id: string;
  name: string;
  offer_type: OfferTypeValue;
  description: string | null;
  coffee_types: string[] | null;
}

function generateQrCodeId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'hunt_';
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function toDateOnly(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toTimeOnly(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function CreateCoffeeOffer() {
  const { user } = useAuth();
  const { offerId } = useParams<{ offerId: string }>();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: orgs, isLoading: orgsLoading } = useOrgs();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEditMode = !!offerId;

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

  const { data: editOffer, isLoading: editLoading } = useQuery({
    queryKey: ['offer-edit', offerId],
    queryFn: async () => {
      if (!offerId) return null;
      const { data: offerData, error: offerErr } = await (supabase as any)
        .from('offers')
        .select('*, treasures(id, hunt_id, name, address, lat, lng, claim_limit, starts_at, ends_at, allocation_mode, per_scan_voucher_amount, allow_duplicate_vouchers, hunts(name))')
        .eq('id', offerId)
        .single();
      if (offerErr) throw offerErr;
      return offerData;
    },
    enabled: !!offerId,
  });

  useEffect(() => {
    if (modeFromUrl === 'hunt' && huntIdFromUrl) {
      setSelectedMode('hunt');
      setSelectedHuntId(huntIdFromUrl);
    }
  }, [modeFromUrl, huntIdFromUrl]);

  useEffect(() => {
    if (isHuntMode && needsHuntPicker && myHunts.length === 0 && !myHuntsLoading) {
      setShowCreateHuntInline(true);
    }
  }, [isHuntMode, needsHuntPicker, myHunts.length, myHuntsLoading]);

  // Pre-fill form when editing
  useEffect(() => {
    if (!editOffer || !isEditMode) return;
    const o = editOffer as any;
    setOrgId(o.org_id ?? '');
    setOfferName(o.name ?? '');
    setOfferType((o.offer_type ?? 'free') as OfferTypeValue);
    setQuantityLimit(o.quantity_limit ?? 17);
    setLocation(o.location ?? '');
    setDescription(o.description ?? '');
    setCoffeeTypes(Array.isArray(o.coffee_types) ? o.coffee_types : []);
    setPresetOfferId(o.preset_offer_id ?? '');
    setRedeemDurationDays(o.redeem_duration_days ?? 7);

    if (o.source_type === 'calendar') {
      setSelectedMode('calendar');
      setDate(toDateOnly(o.event_date) ?? '');
      setStartTime(o.event_time?.slice(0, 5) ?? '');
      setRedeemBeforeTime(o.redeem_before_time?.slice(0, 5) ?? '');
    } else {
      setSelectedMode('hunt');
      const t = Array.isArray(o.treasures) ? o.treasures[0] : o.treasures;
      if (t) {
        setSelectedHuntId(t.hunt_id ?? '');
        setLat(t.lat != null ? String(t.lat) : '');
        setLng(t.lng != null ? String(t.lng) : '');
        setQuantityLimit(t.claim_limit ?? o.quantity_limit ?? 17);
        setAllocationMode((t.allocation_mode ?? 'fixed') as 'fixed' | 'random');
        setPerScanVoucherAmount(t.per_scan_voucher_amount ?? 1);
        setAllowDuplicateVouchers(!!t.allow_duplicate_vouchers);
        setDate(toDateOnly(t.starts_at) ?? '');
        setStartTime(toTimeOnly(t.starts_at) ?? '');
        setEndTime(toTimeOnly(t.ends_at) ?? '');
      }
    }
  }, [editOffer, isEditMode]);

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
  const [presetOfferId, setPresetOfferId] = useState('');
  const [redeemDurationDays, setRedeemDurationDays] = useState(7);
  const [allocationMode, setAllocationMode] = useState<'fixed' | 'random'>('fixed');
  const [perScanVoucherAmount, setPerScanVoucherAmount] = useState(1);
  const [allowDuplicateVouchers, setAllowDuplicateVouchers] = useState(false);
  const [rewardRows, setRewardRows] = useState<
    Array<{ id: string; presetOfferId: string; quota: number; fixedCount: number; weight: number }>
  >([{ id: crypto.randomUUID(), presetOfferId: '', quota: 17, fixedCount: 1, weight: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastAutoLocationRef = useRef<string>('');
  const lastAutoLatRef = useRef<string>('');
  const lastAutoLngRef = useRef<string>('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [createdTreasure, setCreatedTreasure] = useState<{
    qr_code_id: string;
    name: string;
  } | null>(null);

  // Inline hunt creation (when in Hunt mode with no hunt selected)
  const [showCreateHuntInline, setShowCreateHuntInline] = useState(false);
  const [newHuntName, setNewHuntName] = useState('');
  const [newHuntDescription, setNewHuntDescription] = useState('');
  const [isCreatingHunt, setIsCreatingHunt] = useState(false);

  const { data: presetOffers = [] } = useQuery({
    queryKey: ['preset-offers', user?.id, orgId],
    enabled: !!user && !!orgId,
    queryFn: async (): Promise<PresetOffer[]> => {
      const { data, error } = await (supabase as any)
        .from('preset_offers')
        .select('id, org_id, name, offer_type, description, coffee_types')
        .eq('created_by', user.id)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PresetOffer[];
    },
  });

  useEffect(() => {
    const preset = presetOffers.find((p) => p.id === presetOfferId);
    if (!preset) return;
    setOfferType(preset.offer_type);
    setDescription(preset.description ?? '');
    setCoffeeTypes(Array.isArray(preset.coffee_types) ? preset.coffee_types : []);
  }, [presetOfferId, presetOffers]);

  // Default org to first in allowed list when orgs load
  useEffect(() => {
    if (orgs && orgs.length > 0 && !orgId) {
      const first = orgs[0];
      setOrgId(first.id);
      const loc = first.location ?? '';
      setLocation(loc);
      lastAutoLocationRef.current = loc;
      const latStr = first.lat != null ? String(first.lat) : '';
      const lngStr = first.lng != null ? String(first.lng) : '';
      setLat(latStr);
      setLng(lngStr);
      lastAutoLatRef.current = latStr;
      lastAutoLngRef.current = lngStr;
    }
  }, [orgs, orgId]);

  // Auto-fill location from org when org changes (do not overwrite user edits)
  const handleOrgChange = (newOrgId: string) => {
    const newOrg = orgs?.find((o) => o.id === newOrgId);
    setOrgId(newOrgId);
    setPresetOfferId('');

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

    if (newOrg?.lat != null) {
      const newLat = String(newOrg.lat);
      if (lat === '' || lat === lastAutoLatRef.current) {
        setLat(newLat);
        lastAutoLatRef.current = newLat;
      }
    } else {
      if (lat === '' || lat === lastAutoLatRef.current) {
        setLat('');
        lastAutoLatRef.current = '';
      }
    }

    if (newOrg?.lng != null) {
      const newLng = String(newOrg.lng);
      if (lng === '' || lng === lastAutoLngRef.current) {
        setLng(newLng);
        lastAutoLngRef.current = newLng;
      }
    } else {
      if (lng === '' || lng === lastAutoLngRef.current) {
        setLng('');
        lastAutoLngRef.current = '';
      }
    }
  };

  const handleLocationChange = (value: string) => setLocation(value);

  const handleCreateHuntInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !orgId || !newHuntName.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Select organization and enter hunt name.',
        variant: 'destructive',
      });
      return;
    }
    setIsCreatingHunt(true);
    try {
      const { data, error } = await (supabase as any)
        .from('hunts')
        .insert({
          org_id: orgId,
          created_by: user.id,
          name: newHuntName.trim(),
          description: newHuntDescription.trim() || null,
          status: 'draft',
        })
        .select('id')
        .single();
      if (error) throw error;
      const huntId = data?.id;
      if (huntId) {
        setSelectedHuntId(huntId);
        setShowCreateHuntInline(false);
        setNewHuntName('');
        setNewHuntDescription('');
        queryClient.invalidateQueries({ queryKey: ['my-hunts', user.id] });
        toast({ title: 'Hunt created! Now add your treasure.' });
      }
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: (err as Error).message || 'Failed to create hunt.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingHunt(false);
    }
  };

  // Loading state
  if (roleLoading || (isEditMode && editLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">
          {isEditMode ? 'Loading offer...' : 'Loading...'}
        </div>
      </div>
    );
  }

  // Edit mode: offer not found or access denied
  if (isEditMode && !editLoading && !editOffer) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Offer not found or access denied.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/host/offer-campaign', { replace: true })}
          >
            Back to offer campaigns
          </Button>
        </div>
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
            Create Offer Campaign
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
              Create Offer Campaign
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

    if (!presetOfferId) {
      toast({
        title: 'Missing fields',
        description: 'Please select an offer preset.',
        variant: 'destructive',
      });
      return;
    }

    const selectedPreset = presetOffers.find((p) => p.id === presetOfferId);
    if (!selectedPreset) {
      toast({
        title: 'Missing preset',
        description: 'Selected offer preset was not found. Refresh and try again.',
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
      if (isEditMode && editOffer) {
        const o = editOffer as any;
        if (o.source_type === 'calendar') {
          const { error } = await (supabase as any)
            .from('offers')
            .update({
              name: selectedPreset.name,
              campaign_title: offerName.trim() || null,
              offer_type: selectedPreset.offer_type,
              event_date: date,
              event_time: startTime.trim() || null,
              redeem_before_time: redeemBeforeTime.trim() || null,
              location: location.trim() || null,
              description: selectedPreset.description,
              quantity_limit: quantityLimit,
              coffee_types:
                selectedPreset.coffee_types && selectedPreset.coffee_types.length > 0
                  ? selectedPreset.coffee_types
                  : null,
              redeem_duration_days: redeemDurationDays,
              preset_offer_id: selectedPreset.id,
              org_id: orgId,
            })
            .eq('id', offerId);
          if (error) throw error;
          toast({ title: 'Offer updated!' });
          queryClient.invalidateQueries({ queryKey: ['host-offers', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['coffee-offers'] });
          navigate('/host/offer-campaign', { replace: true });
        } else {
          const t = Array.isArray(o.treasures) ? o.treasures[0] : o.treasures;
          const treasureId = t?.id;
          const { starts_at: startsAtVal, ends_at: endsAtVal } = buildHuntTimestamps(
            date,
            startTime,
            endTime
          );
          if (treasureId) {
            const { error: treasureError } = await (supabase as any)
              .from('treasures')
              .update({
                name: offerName.trim(),
                address: location.trim() || null,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                claim_limit: quantityLimit,
                starts_at: startsAtVal,
                ends_at: endsAtVal,
              })
              .eq('id', treasureId);
            if (treasureError) throw treasureError;
          }
          const { error: offerError } = await (supabase as any)
            .from('offers')
            .update({
              name: selectedPreset.name,
              campaign_title: offerName.trim() || null,
              offer_type: selectedPreset.offer_type,
              description: selectedPreset.description,
              quantity_limit: quantityLimit,
              redeem_duration_days: redeemDurationDays,
              preset_offer_id: selectedPreset.id,
              location: location.trim() || null,
              org_id: orgId,
            })
            .eq('id', offerId);
          if (offerError) throw offerError;
          toast({ title: 'Offer updated!' });
          queryClient.invalidateQueries({ queryKey: ['host-offers', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['treasures'] });
          queryClient.invalidateQueries({ queryKey: ['all-treasures'] });
          navigate('/host/offer-campaign', { replace: true });
        }
        return;
      }

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
            allocation_mode: allocationMode,
            per_scan_voucher_amount: perScanVoucherAmount,
            allow_duplicate_vouchers: allowDuplicateVouchers,
          })
          .select('id')
          .single();

        if (treasureError) throw treasureError;

        const rowsToCreate =
          rewardRows.filter((r) => r.presetOfferId).length > 0
            ? rewardRows.filter((r) => r.presetOfferId)
            : [{ id: crypto.randomUUID(), presetOfferId: selectedPreset.id, quota: quantityLimit, fixedCount: 1, weight: 1 }];

        for (let idx = 0; idx < rowsToCreate.length; idx++) {
          const row = rowsToCreate[idx];
          const rowPreset = presetOffers.find((p) => p.id === row.presetOfferId);
          if (!rowPreset) continue;

          const { data: createdOffer, error: offerError } = await (supabase as any)
            .from('offers')
            .insert({
              source_type: 'hunt',
              treasure_id: treasure.id,
              org_id: orgId,
              name: rowPreset.name,
              campaign_title: offerName.trim() || null,
              offer_type: rowPreset.offer_type,
              description: rowPreset.description,
              quantity_limit: row.quota,
              coffee_types:
                rowPreset.coffee_types && rowPreset.coffee_types.length > 0 ? rowPreset.coffee_types : null,
              redeem_duration_days: redeemDurationDays,
              preset_offer_id: rowPreset.id,
              location: location.trim() || null,
              sort_order: idx,
            })
            .select('id')
            .single();

          if (offerError) throw offerError;

          const { error: allocError } = await (supabase as any).from('treasure_offer_allocations').upsert(
            {
              treasure_id: treasure.id,
              offer_id: createdOffer.id,
              sort_order: idx,
              fixed_count: Math.max(1, row.fixedCount),
              allocation_weight: Math.max(1, row.weight),
              is_active: true,
            },
            { onConflict: 'treasure_id,offer_id' }
          );

          if (allocError) throw allocError;
        }

        toast({ title: 'Treasure added!' });
        setCreatedTreasure({ qr_code_id: qrCodeId, name: offerName.trim() });
        setQrDialogOpen(true);
        queryClient.invalidateQueries({ queryKey: ['treasures', effectiveHuntId] });
        queryClient.invalidateQueries({ queryKey: ['all-treasures'] });
      } else {
        const { error } = await (supabase as any).from('offers').insert({
          source_type: 'calendar',
          name: selectedPreset.name,
          campaign_title: offerName.trim() || null,
          offer_type: selectedPreset.offer_type,
          event_date: date,
          event_time: startTime.trim() || null,
          redeem_before_time: redeemBeforeTime.trim() || null,
          location: location.trim() || null,
          description: selectedPreset.description,
          quantity_limit: quantityLimit,
          coffee_types:
            selectedPreset.coffee_types && selectedPreset.coffee_types.length > 0
              ? selectedPreset.coffee_types
              : null,
          redeem_duration_days: redeemDurationDays,
          preset_offer_id: selectedPreset.id,
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

  const submitButtonLabel = isEditMode
    ? 'Save Changes'
    : isHuntMode
      ? 'Add Treasure'
      : 'Create Offer Campaign';

  const handleBack = () => {
    if (isEditMode) {
      navigate('/host/offer-campaign', { replace: true });
    } else if (isHuntMode && effectiveHuntId) {
      navigate(`/host/hunts/${effectiveHuntId}`);
    } else {
      navigate('/host/offer-campaign', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <div className="flex items-center justify-center relative">
          <button onClick={handleBack} className="absolute left-0 p-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black uppercase tracking-tight">
            {isEditMode ? 'Edit Offer Campaign' : 'Create Offer Campaign'}
          </h1>
        </div>
      </div>

      <div className="container px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
          {!isEditMode && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold uppercase">
              Offer Mode
            </Label>
            <Tabs
              value={selectedMode}
              onValueChange={(v) => {
                setSelectedMode(v as 'calendar' | 'hunt');
                if (v === 'calendar') {
                  setSearchParams({});
                  setSelectedHuntId('');
                }
              }}
            >
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="calendar" className="text-lg">
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="hunt" className="text-lg">
                  Hunt
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          )}

          {isHuntMode && needsHuntPicker && !isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="hunt" className="text-sm font-semibold uppercase">
                Hunt *
              </Label>
              {showCreateHuntInline ? (
                <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                  <p className="text-sm font-medium">Create new hunt</p>
                  <form onSubmit={handleCreateHuntInline} className="space-y-3">
                    <Input
                      placeholder="Hunt name (e.g. Central Park Coffee Hunt)"
                      value={newHuntName}
                      onChange={(e) => setNewHuntName(e.target.value)}
                      className="h-12 text-lg"
                      required
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={newHuntDescription}
                      onChange={(e) => setNewHuntDescription(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowCreateHuntInline(false);
                          setNewHuntName('');
                          setNewHuntDescription('');
                        }}
                        disabled={isCreatingHunt}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={isCreatingHunt || !newHuntName.trim()}
                      >
                        {isCreatingHunt ? 'Creating...' : 'Create Hunt'}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  <Select
                    value={selectedHuntId}
                    onValueChange={(v) => {
                      if (v === '__new__') {
                        setShowCreateHuntInline(true);
                      } else {
                        setSelectedHuntId(v);
                      }
                    }}
                    disabled={myHuntsLoading}
                  >
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue
                        placeholder={
                          myHuntsLoading
                            ? 'Loading hunts...'
                            : myHunts.length === 0
                              ? 'Select or create a hunt'
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
                      <SelectItem value="__new__">+ Create new hunt</SelectItem>
                    </SelectContent>
                  </Select>
                  {myHunts.length === 0 && !myHuntsLoading && (
                    <p className="text-sm text-muted-foreground">
                      Select &quot;Create new hunt&quot; above to create one and add your first treasure.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {isHuntMode && (effectiveHuntId || isEditMode) && (
            <p className="text-sm text-muted-foreground">
              {isEditMode ? (
                <>
                  Editing hunt treasure:{' '}
                  <span className="font-medium text-foreground">
                    {(Array.isArray((editOffer as any)?.treasures)
                      ? (editOffer as any).treasures[0]?.hunts?.name
                      : (editOffer as any)?.treasures?.hunts?.name) ?? 'Hunt'}
                  </span>
                </>
              ) : hunt ? (
                <>
                  Adding to: <span className="font-medium text-foreground">{hunt.name}</span>
                </>
              ) : null}
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
              {isHuntMode ? 'Campaign / Treasure Name' : 'Campaign Name'} *
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
            <Label htmlFor="presetOffer" className="text-sm font-semibold uppercase">
              Offer Preset *
            </Label>
            <Select
              value={presetOfferId}
              onValueChange={(v) => setPresetOfferId(v)}
            >
              <SelectTrigger className="h-12 text-lg">
                <SelectValue placeholder="Select preset offer" />
              </SelectTrigger>
              <SelectContent>
                {presetOffers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {presetOfferId ? (
              <p className="text-sm">
                <Link
                  to={`/host/preset-offer/${presetOfferId}`}
                  className="font-medium text-primary underline underline-offset-2 hover:opacity-90"
                >
                  Edit this preset
                </Link>
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Create or edit presets from Profile → Create / manage offer.
            </p>
          </div>

          {presetOfferId && (
            <div className="rounded-lg border border-border p-3 bg-muted/30 space-y-1">
              <p className="text-sm font-semibold">
                {OFFER_TYPES.find((x) => x.value === offerType)?.label ?? offerType}
              </p>
              {coffeeTypes.length > 0 && (
                <p className="text-xs text-muted-foreground">Coffee types: {coffeeTypes.join(', ')}</p>
              )}
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="redeemDurationDays" className="text-sm font-semibold uppercase">
              Redeem Period (Days)
            </Label>
            <Input
              id="redeemDurationDays"
              type="number"
              min={1}
              max={90}
              value={redeemDurationDays}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setRedeemDurationDays(isNaN(v) ? 7 : Math.min(90, Math.max(1, v)));
              }}
              className="h-12 text-lg"
            />
            <p className="text-xs text-muted-foreground">Default 7 days from claim</p>
          </div>

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

          {!presetOfferId && (
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
          )}

          {isHuntMode && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold uppercase">Treasure Allocation Mode</Label>
                <Select value={allocationMode} onValueChange={(v) => setAllocationMode(v as 'fixed' | 'random')}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="random">Random</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold uppercase">Per Scan Voucher Amount</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={perScanVoucherAmount}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setPerScanVoucherAmount(isNaN(v) ? 1 : Math.min(20, Math.max(1, v)));
                  }}
                  className="h-12 text-lg"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowDuplicateVouchers}
                  onChange={(e) => setAllowDuplicateVouchers(e.target.checked)}
                />
                Allow duplicate vouchers in one scan
              </label>

              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold uppercase">Reward Pool</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRewardRows((prev) => [
                        ...prev,
                        { id: crypto.randomUUID(), presetOfferId: '', quota: 17, fixedCount: 1, weight: 1 },
                      ])
                    }
                  >
                    + Add
                  </Button>
                </div>
                {rewardRows.map((row) => (
                  <div key={row.id} className="space-y-1">
                    <div className="grid grid-cols-4 gap-2 items-center">
                    <Select
                      value={row.presetOfferId}
                      onValueChange={(v) =>
                        setRewardRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, presetOfferId: v } : x)))
                      }
                    >
                      <SelectTrigger className="col-span-2 h-10">
                        <SelectValue placeholder="Preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {presetOffers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={row.quota}
                      onChange={(e) =>
                        setRewardRows((prev) =>
                          prev.map((x) =>
                            x.id === row.id ? { ...x, quota: Math.max(1, parseInt(e.target.value || '1', 10)) } : x
                          )
                        )
                      }
                      className="h-10"
                      title="Quota"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRewardRows((prev) => prev.filter((x) => x.id !== row.id))}
                    >
                      Remove
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={row.fixedCount}
                      onChange={(e) =>
                        setRewardRows((prev) =>
                          prev.map((x) =>
                            x.id === row.id ? { ...x, fixedCount: Math.max(1, parseInt(e.target.value || '1', 10)) } : x
                          )
                        )
                      }
                      className="h-10 col-span-2"
                      title="Fixed count"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={row.weight}
                      onChange={(e) =>
                        setRewardRows((prev) =>
                          prev.map((x) =>
                            x.id === row.id ? { ...x, weight: Math.max(1, parseInt(e.target.value || '1', 10)) } : x
                          )
                        )
                      }
                      className="h-10 col-span-2"
                      title="Random weight"
                    />
                    </div>
                    {row.presetOfferId ? (
                      <Link
                        to={`/host/preset-offer/${row.presetOfferId}`}
                        className="text-xs font-medium text-primary underline underline-offset-2 hover:opacity-90"
                      >
                        Edit preset
                      </Link>
                    ) : null}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Quota = max mint count for this reward; Fixed Count used in fixed mode; Weight used in random mode.
                </p>
              </div>

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
            </>
          )}

          <Button
            type="submit"
            className="w-full btn-run btn-run-yes"
            disabled={
              isSubmitting ||
              !presetOfferId ||
              (isHuntMode && !effectiveHuntId) ||
              (isHuntMode && (!location.trim() || !lat.trim() || !lng.trim()))
            }
          >
            {isSubmitting ? (isEditMode ? 'Saving...' : 'Creating...') : submitButtonLabel}
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
