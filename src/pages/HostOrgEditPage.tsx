import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImageIcon, MapPin, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgStaff } from '@/hooks/useOrgStaff';
import { useSearchUsers } from '@/hooks/useUserRuns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { Org, OrgShopType } from '@/hooks/useOrgs';
import { canEditOrgProfileForOrgRole, canManageOrgStaff } from '@/lib/orgStaff';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ClaimSpotsEditor } from '@/components/admin/ClaimSpotsEditor';

const ORG_ROLE_LABEL: Record<string, string> = {
  owner: 'Primary owner',
  host: 'Host',
  manager: 'Manager',
  barista: 'Barista',
};

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
  shop_type: OrgShopType;
  location: string;
  description: string;
  latStr: string;
  lngStr: string;
  instagram_handle: string;
  phone: string;
  google_maps_url: string;
  hk_area: string;
  district: string;
  mtr_station: string;
  openingHours: Record<OpeningDayKey, DayHours>;
  logo_url: string;
  preview_photo_url: string;
};

function emptyDraft(): Draft {
  return {
    org_name: '',
    shop_type: 'physical',
    location: '',
    description: '',
    latStr: '',
    lngStr: '',
    instagram_handle: '',
    phone: '',
    google_maps_url: '',
    hk_area: '',
    district: '',
    mtr_station: '',
    openingHours: defaultWeeklyOpeningHours(),
    logo_url: '',
    preview_photo_url: '',
  };
}

function draftFromOrg(org: Org): Draft {
  return {
    org_name: org.org_name ?? '',
    shop_type: (org.shop_type ?? 'physical') as OrgShopType,
    location: org.location ?? '',
    description: org.description ?? '',
    latStr: org.lat != null ? String(org.lat) : '',
    lngStr: org.lng != null ? String(org.lng) : '',
    instagram_handle: org.instagram_handle ?? '',
    phone: org.phone ?? '',
    google_maps_url: org.google_maps_url ?? '',
    hk_area: org.hk_area ?? '',
    district: org.district ?? '',
    mtr_station: org.mtr_station ?? '',
    openingHours: weeklyFromJson(org.opening_hours),
    logo_url: org.logo_url ?? '',
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

async function uploadOrgLogoToStorage(orgId: string, file: File): Promise<string> {
  const path = `org-logo/${orgId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
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
  const [logoPhotoMode, setLogoPhotoMode] = useState<'link' | 'upload'>('link');
  const [logoPhotoUploading, setLogoPhotoUploading] = useState(false);
  const orgLogoFileRef = useRef<HTMLInputElement>(null);
  const [previewPhotoMode, setPreviewPhotoMode] = useState<'link' | 'upload'>('link');
  const [previewPhotoUploading, setPreviewPhotoUploading] = useState(false);
  const orgPreviewFileRef = useRef<HTMLInputElement>(null);
  const [staffAddSearch, setStaffAddSearch] = useState('');
  const [debouncedStaffQ, setDebouncedStaffQ] = useState('');
  const [staffAddRole, setStaffAddRole] = useState<'host' | 'manager' | 'barista'>('host');
  const [staffSaving, setStaffSaving] = useState(false);

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['host-org-edit', orgId],
    enabled: !!orgId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('orgs').select('*').eq('id', orgId!).single();
      if (error) throw error;
      return data as Org;
    },
  });

  const isPrimaryOwner = Boolean(user && org && org.owner_user_id === user.id);
  const orgRole =
    assignments.find((a) => a.org_id === orgId)?.role ?? (isPrimaryOwner ? 'owner' : null);
  const canEdit =
    isSuperAdmin || (orgRole !== null && canEditOrgProfileForOrgRole(orgRole));
  const readOnlyManager = !isSuperAdmin && orgRole === 'manager';
  const blockedBarista = !isSuperAdmin && orgRole === 'barista';
  const noAccess =
    !orgId ||
    (!isSuperAdmin &&
      !staffLoading &&
      !orgLoading &&
      !assignments.some((a) => a.org_id === orgId) &&
      !isPrimaryOwner);

  const canViewOrgStaffList =
    !!orgId &&
    !!user &&
    (isSuperAdmin || assignments.some((a) => a.org_id === orgId) || isPrimaryOwner);
  const showStaffSection = isSuperAdmin || (!staffLoading && canManageOrgStaff(orgRole));

  const refreshOrgRelatedQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['orgs'] });
    queryClient.invalidateQueries({ queryKey: ['owned-org-id'] });
    queryClient.invalidateQueries({ queryKey: ['discovery-orgs'] });
    queryClient.invalidateQueries({ queryKey: ['org-staff-assignments'] });
    if (orgId) {
      queryClient.invalidateQueries({ queryKey: ['org-staff-admin', orgId] });
      queryClient.invalidateQueries({ queryKey: ['host-org-edit', orgId] });
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedStaffQ(staffAddSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [staffAddSearch]);

  const { data: staffSearchResults = [] } = useSearchUsers(debouncedStaffQ);

  const { data: orgStaffRows = [], isLoading: orgStaffLoading } = useQuery({
    queryKey: ['org-staff-admin', orgId],
    enabled: canViewOrgStaffList,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_hosts')
        .select('id, user_id, role')
        .eq('org_id', orgId!);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [] as { id: string; user_id: string; role: string; username: string }[];
      const ids = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', ids);
      if (pErr) throw pErr;
      const map = new Map((profiles ?? []).map((p) => [p.user_id, p.username as string]));
      return rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        username: map.get(r.user_id) ?? r.user_id,
      }));
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

  const logoPhotoSrc = draft.logo_url.trim() as string;
  const previewPhotoSrc = draft.preview_photo_url.trim() as string;

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setLogoPhotoUploading(true);
    try {
      const url = await uploadOrgLogoToStorage(orgId, file);
      patchDraft({ logo_url: url });
      setLogoPhotoMode('link');
      toast({ title: 'Logo uploaded!' });
      queryClient.invalidateQueries({ queryKey: ['orgs'] });
      queryClient.invalidateQueries({ queryKey: ['discovery-orgs'] });
    } catch (err: unknown) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not upload logo.',
        variant: 'destructive',
      });
    } finally {
      setLogoPhotoUploading(false);
    }
  };

  const clearLogoPhoto = () => {
    patchDraft({ logo_url: '' });
    if (orgLogoFileRef.current) orgLogoFileRef.current.value = '';
  };

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
    const isOnline = draft.shop_type === 'online';
    const lat = parseCoord(draft.latStr);
    const lng = parseCoord(draft.lngStr);
    const openingPayload = weeklyToJson(draft.openingHours);
    const row = {
      org_name: name,
      shop_type: draft.shop_type,
      description: draft.description.trim() || null,
      instagram_handle: draft.instagram_handle.trim() || null,
      phone: draft.phone.trim() || null,
      logo_url: draft.logo_url.trim() || null,
      preview_photo_url: draft.preview_photo_url.trim() || null,
      // Location-only fields are nulled out for online shops so stale storefront geo
      // never reaches the discovery map or public org page.
      location: isOnline ? null : draft.location.trim() || null,
      lat: isOnline ? null : lat,
      lng: isOnline ? null : lng,
      google_maps_url: isOnline ? null : draft.google_maps_url.trim() || null,
      opening_hours: isOnline ? null : (openingPayload as unknown),
      hk_area: isOnline ? null : draft.hk_area.trim() || null,
      district: isOnline ? null : draft.district.trim() || null,
      mtr_station: isOnline ? null : draft.mtr_station.trim() || null,
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

  const handleAddStaffMember = async (userId: string) => {
    if (!orgId || !showStaffSection) return;
    setStaffSaving(true);
    try {
      const { error } = await supabase.from('org_hosts').insert({
        org_id: orgId,
        user_id: userId,
        role: staffAddRole,
      });
      if (error) throw error;
      setStaffAddSearch('');
      toast({ title: 'Staff added' });
      refreshOrgRelatedQueries();
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: 'Could not add staff',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setStaffSaving(false);
    }
  };

  const handleRemoveStaffMember = async (row: { id: string; user_id: string; role: string }) => {
    if (org && row.user_id === org.owner_user_id && row.role === 'owner') {
      toast({
        title: 'Cannot remove primary owner',
        description: 'Assign a different primary owner first, then remove this row.',
        variant: 'destructive',
      });
      return;
    }
    if (!orgId) return;
    setStaffSaving(true);
    try {
      const { error } = await supabase.from('org_hosts').delete().eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Removed' });
      refreshOrgRelatedQueries();
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: 'Remove failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setStaffSaving(false);
    }
  };

  const handleStaffRoleChange = async (
    row: { id: string; user_id: string; role: string },
    newRole: 'host' | 'manager' | 'barista'
  ) => {
    if (row.role === 'owner' || !orgId) return;
    setStaffSaving(true);
    try {
      const { error } = await supabase.from('org_hosts').update({ role: newRole }).eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Role updated' });
      refreshOrgRelatedQueries();
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: 'Could not update role',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setStaffSaving(false);
    }
  };

  if (loading || roleLoading || staffLoading || orgLoading || (canViewOrgStaffList && orgStaffLoading)) {
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
          <button type="button" onClick={() => navigate('/host/orgs')} className="absolute left-0 p-2" aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-2xl font-bold tracking-normal">Organization</h1>
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
        <button type="button" onClick={() => navigate('/host/orgs')} className="absolute left-0 p-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-2xl font-bold tracking-normal">Edit organization</h1>
      </div>

      <div className="container max-w-lg px-4 pt-4">
        <Button type="button" variant="secondary" className="w-full" onClick={() => navigate(`/org/${orgId}/menu`)}>
          Menu &amp; campaigns
        </Button>
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
            <h3 className="text-sm font-semibold tracking-normal text-foreground">Core info</h3>
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
              <Label>Shop type</Label>
              <RadioGroup
                value={draft.shop_type}
                onValueChange={(v) => patchDraft({ shop_type: v as OrgShopType })}
                disabled={disabled}
                className="grid grid-cols-2 gap-2"
              >
                <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <RadioGroupItem value="physical" id="shop-type-physical" />
                  Physical shop
                </label>
                <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <RadioGroupItem value="online" id="shop-type-online" />
                  Online shop
                </label>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                {draft.shop_type === 'online'
                  ? 'Online shops hide storefront fields. Configure pickup destinations under Claim spots below.'
                  : 'Physical shops use the org address and coordinates as the storefront pin.'}
              </p>
            </div>
            {draft.shop_type === 'physical' ? (
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
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="org_description">Description (public profile)</Label>
              <Textarea
                id="org_description"
                value={draft.description}
                onChange={(e) => patchDraft({ description: e.target.value })}
                placeholder="Shown on the public organization page for guests."
                rows={4}
                disabled={disabled}
                className="min-h-[100px] resize-y"
              />
            </div>
            {draft.shop_type === 'physical' ? (
              <>
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
              </>
            ) : null}
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
                value={logoPhotoMode}
                onValueChange={(v) => setLogoPhotoMode(v as 'link' | 'upload')}
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
                    value={draft.logo_url}
                    onChange={(e) => patchDraft({ logo_url: e.target.value })}
                    disabled={disabled}
                    className="h-11"
                    type="url"
                  />
                </TabsContent>
                <TabsContent value="upload" className="mt-3 space-y-2">
                  <input
                    ref={orgLogoFileRef}
                    type="file"
                    accept={PREVIEW_MIME.join(',')}
                    className="hidden"
                    onChange={handleLogoFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={disabled || logoPhotoUploading}
                    onClick={() => orgLogoFileRef.current?.click()}
                  >
                    {logoPhotoUploading ? 'Uploading…' : 'Choose logo'}
                  </Button>
                </TabsContent>
              </Tabs>
              {logoPhotoSrc ? (
                <div className="relative mx-auto w-32 overflow-hidden rounded-lg border border-border">
                  <img src={logoPhotoSrc} alt="" className="aspect-square w-full object-cover" />
                  {!disabled ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute right-1 top-1 gap-1 px-2 py-1 text-xs shadow-sm"
                      onClick={clearLogoPhoto}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <Label className="text-foreground">Preview image</Label>
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

          {draft.shop_type === 'online' ? (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold tracking-normal text-foreground">Pickup locations</h3>
              {orgId ? (
                <ClaimSpotsEditor orgId={orgId} disabled={disabled} />
              ) : null}
            </section>
          ) : null}

          {draft.shop_type === 'physical' ? (
          <section className="space-y-4">
            <h3 className="text-sm font-semibold tracking-normal text-foreground">Discovery</h3>
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
              <p className="text-xs font-medium tracking-normal text-muted-foreground">Open in Maps</p>
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
          ) : null}

          {showStaffSection ? (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold tracking-normal text-foreground">Staff</h3>
              <p className="text-xs text-muted-foreground">
                Add Host, Manager, or Barista roles for other accounts. The primary owner cannot be removed or
                reassigned here; use the admin console to change primary ownership.
              </p>
              {orgStaffLoading ? (
                <p className="text-sm text-muted-foreground">Loading staff…</p>
              ) : orgStaffRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff rows yet.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2 text-sm">
                  {orgStaffRows.map((row) => {
                    const isPrimaryOwnerRow =
                      row.role === 'owner' &&
                      !!org?.owner_user_id &&
                      row.user_id === org.owner_user_id;
                    return (
                      <li
                        key={row.id}
                        className="flex flex-col gap-2 rounded-md px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                      >
                        <span className="min-w-0 font-medium">{row.username}</span>
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:justify-end">
                          {row.role === 'owner' ? (
                            <span className="text-xs text-muted-foreground">
                              {ORG_ROLE_LABEL[row.role] ?? row.role}
                            </span>
                          ) : (
                            <Select
                              value={row.role}
                              onValueChange={(v) =>
                                handleStaffRoleChange(row, v as 'host' | 'manager' | 'barista')
                              }
                              disabled={staffSaving}
                            >
                              <SelectTrigger className="h-9 w-[140px]" aria-label="Staff role">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="host">Host</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="barista">Barista</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-destructive"
                            disabled={staffSaving || isPrimaryOwnerRow}
                            onClick={() => handleRemoveStaffMember(row)}
                          >
                            Remove
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="space-y-2">
                <Label htmlFor="host-staff-search">Add staff by username</Label>
                <Input
                  id="host-staff-search"
                  value={staffAddSearch}
                  onChange={(e) => setStaffAddSearch(e.target.value)}
                  placeholder="At least 2 characters"
                  className="h-11"
                  autoComplete="off"
                />
                <div className="space-y-2">
                  <Label>Role for new staff</Label>
                  <Select
                    value={staffAddRole}
                    onValueChange={(v) => setStaffAddRole(v as 'host' | 'manager' | 'barista')}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="host">Host</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="barista">Barista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {staffSearchResults.length > 0 ? (
                  <ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-background text-sm">
                    {staffSearchResults.map((u) => (
                      <li key={u.user_id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted"
                          disabled={staffSaving}
                          onClick={() => handleAddStaffMember(u.user_id)}
                        >
                          {u.username}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ) : null}

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
