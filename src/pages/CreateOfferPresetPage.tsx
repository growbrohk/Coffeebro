import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgs } from '@/hooks/useOrgs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { OFFER_TYPES, type OfferTypeValue } from '@/lib/offerForm';
import { CoffeeTypeSelect } from '@/components/CoffeeTypeSelect';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
  const [clueImageUrl, setClueImageUrl] = useState('');
  const [cluePhotoMode, setCluePhotoMode] = useState<'link' | 'upload'>('link');
  const [clueImageUploading, setClueImageUploading] = useState(false);
  const [pendingClueFile, setPendingClueFile] = useState<File | null>(null);
  const [pendingCluePreviewUrl, setPendingCluePreviewUrl] = useState<string | null>(null);
  const clueFileInputRef = useRef<HTMLInputElement>(null);
  const pendingPreviewObjectUrlRef = useRef<string | null>(null);

  const revokePendingPreview = () => {
    if (pendingPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(pendingPreviewObjectUrlRef.current);
      pendingPreviewObjectUrlRef.current = null;
    }
    setPendingCluePreviewUrl(null);
  };

  const setPendingFileWithPreview = (file: File | null) => {
    revokePendingPreview();
    setPendingClueFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      pendingPreviewObjectUrlRef.current = url;
      setPendingCluePreviewUrl(url);
    }
  };

  const {
    data: editPreset,
    isLoading: editLoading,
    isError: editQueryError,
    isFetched: editFetched,
  } = useQuery({
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
    setClueImageUrl(editPreset.clue_image ?? '');
    setPendingClueFile(null);
    if (pendingPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(pendingPreviewObjectUrlRef.current);
      pendingPreviewObjectUrlRef.current = null;
    }
    setPendingCluePreviewUrl(null);
  }, [editPreset]);

  useEffect(() => {
    return () => {
      if (pendingPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(pendingPreviewObjectUrlRef.current);
        pendingPreviewObjectUrlRef.current = null;
      }
    };
  }, []);

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

  const editLoadFailed =
    isEditMode && !editLoading && editFetched && (editQueryError || editPreset == null);

  const handlePresetClueFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please use JPEG, PNG, WebP, or GIF.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum size is 5MB.',
        variant: 'destructive',
      });
      return;
    }

    if (isEditMode && presetId) {
      setClueImageUploading(true);
      try {
        const path = `presets/${presetId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error } = await supabase.storage.from('treasure-images').upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });
        if (error) throw error;
        const { data } = supabase.storage.from('treasure-images').getPublicUrl(path);
        setClueImageUrl(data.publicUrl);
        setCluePhotoMode('link');
        revokePendingPreview();
        setPendingClueFile(null);
        toast({ title: 'Photo uploaded!' });
      } catch (err: unknown) {
        toast({
          title: 'Upload failed',
          description: (err as Error).message || 'Could not upload photo.',
          variant: 'destructive',
        });
      } finally {
        setClueImageUploading(false);
      }
    } else {
      setClueImageUrl('');
      setPendingFileWithPreview(file);
    }
  };

  const clearClueImage = () => {
    setClueImageUrl('');
    setPendingClueFile(null);
    revokePendingPreview();
  };

  const previewSrc = (pendingCluePreviewUrl || clueImageUrl.trim()) as string;

  if (editLoadFailed) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
          <div className="flex items-center justify-center relative">
            <button type="button" onClick={() => navigate('/host/preset-offers')} className="absolute left-0 p-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-black uppercase tracking-tight">Offer preset</h1>
          </div>
        </div>
        <div className="container px-4 py-8 text-center max-w-sm mx-auto">
          <p className="text-muted-foreground">
            This preset could not be loaded. It may have been removed or you may not have access.
          </p>
          <Button variant="outline" className="mt-4 w-full btn-run" onClick={() => navigate('/host/preset-offers')}>
            Back to offer presets
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
      const basePayload = {
        org_id: orgId,
        created_by: user.id,
        name: name.trim(),
        offer_type: offerType,
        description: description.trim() || null,
        coffee_types: coffeeTypes.length > 0 ? coffeeTypes : null,
      };

      if (isEditMode) {
        const payload = {
          ...basePayload,
          clue_image: clueImageUrl.trim() || null,
        };
        const { error } = await (supabase as any).from('preset_offers').update(payload).eq('id', presetId);
        if (error) throw error;
        toast({ title: 'Offer preset updated!' });
      } else {
        const insertPayload = {
          ...basePayload,
          clue_image: pendingClueFile ? null : clueImageUrl.trim() || null,
        };
        const { data: created, error } = await (supabase as any)
          .from('preset_offers')
          .insert(insertPayload)
          .select('id')
          .single();
        if (error) throw error;

        if (pendingClueFile && created?.id) {
          const file = pendingClueFile;
          const path = `presets/${created.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const { error: uploadError } = await supabase.storage.from('treasure-images').upload(path, file, {
            cacheControl: '3600',
            upsert: true,
          });
          if (uploadError) throw uploadError;
          const { data: pub } = supabase.storage.from('treasure-images').getPublicUrl(path);
          const { error: clueErr } = await (supabase as any)
            .from('preset_offers')
            .update({ clue_image: pub.publicUrl })
            .eq('id', created.id);
          if (clueErr) throw clueErr;
        }

        revokePendingPreview();
        setPendingClueFile(null);
        toast({ title: 'Offer preset created!' });
      }

      queryClient.invalidateQueries({ queryKey: ['preset-offers', user.id] });
      queryClient.invalidateQueries({ queryKey: ['preset-offers-list', user.id] });
      queryClient.invalidateQueries({ queryKey: ['preset-offer-edit', presetId] });
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
            <Label className="text-sm font-semibold uppercase">Clue image (optional)</Label>
            <Tabs value={cluePhotoMode} onValueChange={(v) => setCluePhotoMode(v as 'link' | 'upload')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link">Photo link</TabsTrigger>
                <TabsTrigger value="upload">Upload photo</TabsTrigger>
              </TabsList>
              <TabsContent value="link" className="mt-2 space-y-2">
                <Input
                  type="url"
                  value={clueImageUrl}
                  onChange={(e) => {
                    setClueImageUrl(e.target.value);
                    if (e.target.value.trim()) {
                      setPendingClueFile(null);
                      revokePendingPreview();
                    }
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="h-12 text-lg"
                />
              </TabsContent>
              <TabsContent value="upload" className="mt-2 space-y-2">
                <input
                  ref={clueFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handlePresetClueFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={clueImageUploading}
                  onClick={() => clueFileInputRef.current?.click()}
                >
                  {clueImageUploading ? (
                    'Uploading...'
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Choose file (max 5MB, JPEG/PNG/WebP/GIF)
                    </>
                  )}
                </Button>
                {!isEditMode && pendingClueFile ? (
                  <p className="text-xs text-muted-foreground">This file uploads when you save the preset.</p>
                ) : null}
              </TabsContent>
            </Tabs>
            {previewSrc ? (
              <div className="flex items-center gap-2">
                <img src={previewSrc} alt="" className="h-20 w-20 rounded-lg border object-cover" />
                <Button type="button" variant="ghost" size="sm" onClick={clearClueImage}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>

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

