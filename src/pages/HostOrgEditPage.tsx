import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImageIcon, MapPin, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgStaff } from '@/hooks/useOrgStaff';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { OpeningHoursEditor } from '@/components/admin/OpeningHoursEditor';
import {
  defaultWeeklyOpeningHours,
  weeklyFromJson,
  weeklyToJson,
  type OpeningDayKey,
  type DayHours,
} from '@/lib/openingHours';
import { HK_DISTRICTS } from '@/data/hkDistricts';
import { getMtrStationsForDistrict } from '@/data/mtrStationsByDistrict';
import { isNearHongKong } from '@/lib/hkMapBounds';
import type { Org } from '@/hooks/useOrgs';
import { canEditOrgProfileForOrgRole } from '@/lib/orgStaff';

const MAX_PREVIEW_SIZE = 5 * 1024 * 1024;
const PREVIEW_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const HK_AREA_OPTIONS = [
  { value: '__none__', label: 'Not set' },
  { value: 'hk_island', label: 'HK Island' },
  { value: 'kowloon', label: 'Kowloon' },
  { value: 'new_territories', label: 'New Territories' },
] as const;

function parseCoord(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function mapsPreviewUrl(
  googleMapsUrl: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined
): string | null {
  const u = googleMapsUrl?.trim();
  if (u) return u;
  if (lat != null && lng != null) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  return null;
}

type Draft = {
  org_name: string;
  location: string;
  latStr: string;
  lngStr: string;
  instagram_handle: string;
  phone: string;
  google_maps_url: string;
  hk_area: string;
  district: string;
  mtr_station: string;
  openingHours: Record<OpeningDayKey, DayHours>;
  preview_photo_url: string;
};

function emptyDraft(): Draft {
  return {
    org_name: '',
    location: '',
    latStr: '',
    lngStr: '',
    instagram_handle: '',
    phone: '',
    google_maps_url: '',
    hk_area: '',
    district: '',
    mtr_station: '',
    openingHours: defaultWeeklyOpeningHours(),
    preview_photo_url: '',
  };
}

function draftFromOrg(org: Org): Draft {
  return {
    org_name: org.org_name ?? '',
    location: org.location ?? '',
    latStr: org.lat != null ? String(org.lat) : '',
    lngStr: org.lng != null ? String(org.lng) : '',
    instagram_handle: org.instagram_handle ?? '',
    phone: org.phone ?? '',
    google_maps_url: org.google_maps_url ?? '',
    hk_area: org.hk_area ?? '',
    district: org.district ?? '',
    mtr_station: org.mtr_station ?? '',
    openingHours: weeklyFromJson(org.opening_hours),
    preview_photo_url: org.preview_photo_url ?? '',
  };
}

async function uploadOrgPreviewToStorage(orgId: string, file: File): Promise<string> {
  const path = `org-preview/${orgId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const { error } = await supabase.storage.from('treasure-images').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('treasure-images').getPublicUrl(path);
  return data.publicUrl;
}

export default function HostOrgEditPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: assignments = [], isLoading: staffLoading } = useOrgStaff();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [previewPhotoMode, setPreviewPhotoMode] = useState<'link' | 'upload'>('link');
  const [previewPhotoUploading, setPreviewPhotoUploading] = useState(false);
  const orgPreviewFileRef = useRef<HTMLInputElement>(null);

  const orgRole = assignments.find((a) => a.org_id === orgId)?.role ?? null;
  const canEdit =
    isSuperAdmin || (orgRole !== null && canEditOrgProfileForOrgRole(orgRole));
  const readOnlyManager = !isSuperAdmin && orgRole === 'manager';
  const blockedBarista = !isSuperAdmin && orgRole === 'barista';
  const noAccess =
    !orgId ||
    (!isSuperAdmin && !staffLoading && !assignments.some((a) => a.org_id === orgId));

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['host-org-edit', orgId],
    enabled: !!orgId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('orgs').select('*').eq('id', orgId!).single();
      if (error) throw error;
      return data as Org;
    },
  });

  useEffect(() => {
    if (org) setDraft(draftFromOrg(org));
  }, [org]);

  const patchDraft = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const mtrOptions = useMemo(() => {
    const base = draft.district ? [...getMtrStationsForDistrict(draft.district)] : [];
    const m = draft.mtr_station.trim();
    if (m && !base.includes(m)) base.push(m);
    base.sort((a, b) => a.localeCompare(b));
    return base;
  }, [draft.district, draft.mtr_station]);

  const mapCoordHint = useMemo(() => {
    const lat = parseCoord(draft.latStr);
    const lng = parseCoord(draft.lngStr);
    const latEmpty = !draft.latStr.trim();
    const lngEmpty = !draft.lngStr.trim();
    if (lat == null || lng == null) {
      if (latEmpty && lngEmpty) {
        return 'Without latitude and longitude, this organization will not show as a pin on the explorer map.';
      }
      return 'Enter both latitude and longitude so the café appears on the map.';
    }
    if (!isNearHongKong(lat, lng)) {
      return 'These coordinates look outside the usual Hong Kong area. Check for typos or swapped latitude and longitude.';
    }
    return null;
  }, [draft.latStr, draft.lngStr]);

  const previewMapsUrl = mapsPreviewUrl(
    draft.google_maps_url || null,
    parseCoord(draft.latStr),
    parseCoord(draft.lngStr)
  );

  const previewPhotoSrc = draft.preview_photo_url.trim() as string;

  const handlePreviewFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !orgId) return;
    if (!PREVIEW_MIME.includes(file.type)) {
      toast({ title: 'Invalid file type', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_PREVIEW_SIZE) {
      toast({ title: 'File too large', variant: 'destructive' });
      return;
    }
    setPreviewPhotoUploading(true);
    try {
      const url = await uploadOrgPreviewToStorage(orgId, file);
      patchDraft({ preview_photo_url: url });
      setPreviewPhotoMode('link');
      toast({ title: 'Photo uploaded!' });
      queryClient.invalidateQueries({ queryKey: ['orgs'] });
      queryClient.invalidateQueries({ queryKey: ['discovery-orgs'] });
    } catch (err: unknown) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not upload photo.',
        variant: 'destructive',
      });
    } finally {
      setPreviewPhotoUploading(false);
    }
  };

  const clearPreviewPhoto = () => {
    patchDraft({ preview_photo_url: '' });
    if (orgPreviewFileRef.current) orgPreviewFileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !canEdit || readOnlyManager) return;
    const name = draft.org_name.trim();
    if (!name) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const lat = parseCoord(draft.latStr);
    const lng = parseCoord(draft.lngStr);
    const openingPayload = weeklyToJson(draft.openingHours);
    const row = {
      org_name: name,
      location: draft.location.trim() || null,
      lat,
      lng,
      instagram_handle: draft.instagram_handle.trim() || null,
      phone: draft.phone.trim() || null,
      google_maps_url: draft.google_maps_url.trim() || null,
      opening_hours: openingPayload as unknown,
      hk_area: draft.hk_area.trim() || null,
      district: draft.district.trim() || null,
      mtr_station: draft.mtr_station.trim() || null,
      preview_photo_url: draft.preview_photo_url.trim() || null,
    };

    setSaving(true);
    try {
      const { error } = await supabase.from('orgs').update(row).eq('id', orgId);
      if (error) throw error;
      toast({ title: 'Saved' });
      queryClient.invalidateQueries({ queryKey: ['orgs'] });
      queryClient.invalidateQueries({ queryKey: ['discovery-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['host-org-edit', orgId] });
    } catch (err: unknown) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || roleLoading || staffLoading || orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Sign in to continue.</p>
        <Button className="mx-auto mt-4 block" onClick={() => navigate('/profile')}>
          Profile
        </Button>
      </div>
    );
  }

  if (!orgId || noAccess) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Organization not found or access denied.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate('/profile')}>
          Back
        </Button>
      </div>
    );
  }

  if (blockedBarista) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
          <button type="button" onClick={() => navigate('/profile')} className="absolute left-0 p-2" aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-black uppercase tracking-tight">Organization</h1>
        </div>
        <div className="container max-w-lg px-4 py-8">
          <p className="text-center text-muted-foreground">
            Barista accounts cannot edit organization settings.
          </p>
        </div>
      </div>
    );
  }

  const disabled = !canEdit || readOnlyManager;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
        <button type="button" onClick={() => navigate('/profile')} className="absolute left-0 p-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-black uppercase tracking-tight">Edit organization</h1>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        {readOnlyManager ? (
          <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            Managers can view this page but cannot change organization profile. Ask a host or primary owner to update
            details.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-foreground">Core info</h3>
            <div className="space-y-2">
              <Label htmlFor="org_name">Name</Label>
              <Input
                id="org_name"
                value={draft.org_name}
                onChange={(e) => patchDraft({ org_name: e.target.value })}
                required
                disabled={disabled}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Address</Label>
              <Input
                id="location"
                value={draft.location}
                onChange={(e) => patchDraft({ location: e.target.value })}
                disabled={disabled}
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  inputMode="decimal"
                  value={draft.latStr}
                  onChange={(e) => patchDraft({ latStr: e.target.value })}
                  disabled={disabled}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  inputMode="decimal"
                  value={draft.lngStr}
                  onChange={(e) => patchDraft({ lngStr: e.target.value })}
                  disabled={disabled}
                  className="h-11"
                />
              </div>
            </div>
            {mapCoordHint ? <p className="text-sm text-muted-foreground">{mapCoordHint}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram handle</Label>
              <Input
                id="instagram"
                value={draft.instagram_handle}
                onChange={(e) => patchDraft({ instagram_handle: e.target.value })}
                disabled={disabled}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                value={draft.phone}
                onChange={(e) => patchDraft({ phone: e.target.value })}
                disabled={disabled}
                className="h-11"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <Label className="text-foreground">Logo</Label>
              </div>
              <Tabs
                value={previewPhotoMode}
                onValueChange={(v) => setPreviewPhotoMode(v as 'link' | 'upload')}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger type="button" value="link" disabled={disabled}>
                    Image URL
                  </TabsTrigger>
                  <TabsTrigger type="button" value="upload" disabled={disabled}>
                    Upload
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="link" className="mt-3 space-y-2">
                  <Input
                    value={draft.preview_photo_url}
                    onChange={(e) => patchDraft({ preview_photo_url: e.target.value })}
                    disabled={disabled}
                    className="h-11"
                    type="url"
                  />
                </TabsContent>
                <TabsContent value="upload" className="mt-3 space-y-2">
                  <input
                    ref={orgPreviewFileRef}
                    type="file"
                    accept={PREVIEW_MIME.join(',')}
                    className="hidden"
                    onChange={handlePreviewFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={disabled || previewPhotoUploading}
                    onClick={() => orgPreviewFileRef.current?.click()}
                  >
                    {previewPhotoUploading ? 'Uploading…' : 'Choose photo'}
                  </Button>
                </TabsContent>
              </Tabs>
              {previewPhotoSrc ? (
                <div className="relative overflow-hidden rounded-lg border border-border">
                  <img src={previewPhotoSrc} alt="" className="aspect-video w-full object-cover" />
                  {!disabled ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute right-2 top-2 gap-1 shadow-sm"
                      onClick={clearPreviewPhoto}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-foreground">Discovery</h3>
            <div className="space-y-2">
              <Label>Opening hours</Label>
              <OpeningHoursEditor
                value={draft.openingHours}
                onChange={(openingHours) => patchDraft({ openingHours })}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gmaps">Google Maps link</Label>
              <Input
                id="gmaps"
                value={draft.google_maps_url}
                onChange={(e) => patchDraft({ google_maps_url: e.target.value })}
                disabled={disabled}
                className="h-11"
              />
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Open in Maps</p>
              {previewMapsUrl ? (
                <a
                  href={previewMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary underline"
                >
                  <MapPin className="h-4 w-4" />
                  Open preview
                </a>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Add a Maps link or latitude and longitude.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>HK area</Label>
              <Select
                value={draft.hk_area ? draft.hk_area : '__none__'}
                onValueChange={(v) => patchDraft({ hk_area: v === '__none__' ? '' : v })}
                disabled={disabled}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent>
                  {HK_AREA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Select
                value={draft.district ? draft.district : '__none__'}
                onValueChange={(v) => {
                  const district = v === '__none__' ? '' : v;
                  const updates: Partial<Draft> = { district };
                  if (!district) {
                    updates.mtr_station = '';
                  } else {
                    const allowed = new Set(getMtrStationsForDistrict(district));
                    if (draft.mtr_station && !allowed.has(draft.mtr_station)) {
                      updates.mtr_station = '';
                    }
                  }
                  patchDraft(updates);
                }}
                disabled={disabled}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  {HK_DISTRICTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mtr">MTR station</Label>
              <Select
                disabled={disabled || !draft.district}
                value={draft.mtr_station ? draft.mtr_station : '__none__'}
                onValueChange={(v) => patchDraft({ mtr_station: v === '__none__' ? '' : v })}
              >
                <SelectTrigger id="mtr" className="h-11">
                  <SelectValue placeholder={draft.district ? 'Station' : 'Select a district first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  {mtrOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          {canEdit && !readOnlyManager ? (
            <Button type="submit" className="w-full btn-run" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
