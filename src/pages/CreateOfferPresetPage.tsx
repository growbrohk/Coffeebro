import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgs } from '@/hooks/useOrgs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { OFFER_TYPES, type OfferTypeValue } from '@/lib/offerForm';
import { CoffeeTypeSelect } from '@/components/CoffeeTypeSelect';

export default function CreateOfferPresetPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { presetId } = useParams<{ presetId: string }>();
  const isEditMode = !!presetId;

  const { user } = useAuth();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: orgs = [], isLoading: orgsLoading } = useOrgs();
  const { toast } = useToast();

  const [orgId, setOrgId] = useState('');
  const [name, setName] = useState('');
  const [offerType, setOfferType] = useState<OfferTypeValue>('free');
  const [description, setDescription] = useState('');
  const [coffeeTypes, setCoffeeTypes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: editPreset, isLoading: editLoading } = useQuery({
    queryKey: ['preset-offer-edit', presetId],
    enabled: !!presetId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('preset_offers')
        .select('*')
        .eq('id', presetId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!orgId && orgs.length > 0) {
      setOrgId(orgs[0].id);
    }
  }, [orgs, orgId]);

  useEffect(() => {
    if (!editPreset) return;
    setOrgId(editPreset.org_id ?? '');
    setName(editPreset.name ?? '');
    setOfferType((editPreset.offer_type ?? 'free') as OfferTypeValue);
    setDescription(editPreset.description ?? '');
    setCoffeeTypes(Array.isArray(editPreset.coffee_types) ? editPreset.coffee_types : []);
  }, [editPreset]);

  if (roleLoading || (isEditMode && editLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user || !canHostEvent) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Host access is required.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/profile')}>
            Back to Profile
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Organization and preset name are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        org_id: orgId,
        created_by: user.id,
        name: name.trim(),
        offer_type: offerType,
        description: description.trim() || null,
        coffee_types: coffeeTypes.length > 0 ? coffeeTypes : null,
      };

      if (isEditMode) {
        const { error } = await (supabase as any).from('preset_offers').update(payload).eq('id', presetId);
        if (error) throw error;
        toast({ title: 'Offer preset updated!' });
      } else {
        const { error } = await (supabase as any).from('preset_offers').insert(payload);
        if (error) throw error;
        toast({ title: 'Offer preset created!' });
      }

      queryClient.invalidateQueries({ queryKey: ['preset-offers', user.id] });
      queryClient.invalidateQueries({ queryKey: ['preset-offers-list', user.id] });
      navigate('/host/preset-offers');
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save preset.',
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
          <button type="button" onClick={() => navigate('/host/preset-offers')} className="absolute left-0 p-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black uppercase tracking-tight">
            {isEditMode ? 'Edit Offer Preset' : 'Create Offer Preset'}
          </h1>
        </div>
      </div>
      <div className="container px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
          <div className="space-y-2">
            <Label className="text-sm font-semibold uppercase">Organization *</Label>
            <Select value={orgId} onValueChange={setOrgId} disabled={orgsLoading}>
              <SelectTrigger className="h-12 text-lg">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.org_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold uppercase">Offer Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-lg" required />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold uppercase">Offer Type *</Label>
            <Select value={offerType} onValueChange={(v) => setOfferType(v as OfferTypeValue)}>
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
            <CoffeeTypeSelect
              value={coffeeTypes}
              onChange={setCoffeeTypes}
              maxSelected={2}
              label="Coffee type (choose up to 2)"
            />
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold uppercase">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[100px]" />
          </div>

          <Button type="submit" className="w-full btn-run btn-run-yes" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditMode ? 'Save Preset' : 'Create Preset'}
          </Button>
        </form>
      </div>
    </div>
  );
}

