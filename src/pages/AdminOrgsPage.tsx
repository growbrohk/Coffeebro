import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImageIcon, MapPin, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgs, type Org } from '@/hooks/useOrgs';
import { useSearchUsers } from '@/hooks/useUserRuns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  logo_url: string;
  preview_photo_url: string;
  owner_user_id: string;
  hostSearch: string;
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
    logo_url: '',
    preview_photo_url: '',
    owner_user_id: '',
    hostSearch: '',
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
    logo_url: org.logo_url ?? '',
    preview_photo_url: org.preview_photo_url ?? '',
    owner_user_id: org.owner_user_id ?? '',
    hostSearch: '',
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

export default function AdminOrgsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: orgs = [], isLoading: orgsLoading } = useOrgs();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const refreshOrgRelatedQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['orgs'] });
    queryClient.invalidateQueries({ queryKey: ['discovery-orgs'] });
    queryClient.invalidateQueries({ queryKey: ['org-staff-assignments'] });
  };

  const [activeOrgId, setActiveOrgId] = useState<string | null | 'new' | 'idle'>('idle');
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [debouncedHostQ, setDebouncedHostQ] = useState('');
  const [staffAddSearch, setStaffAddSearch] = useState('');
  const [debouncedStaffQ, setDebouncedStaffQ] = useState('');
  const [staffAddRole, setStaffAddRole] = useState<'host' | 'manager' | 'barista'>('host');
  const [staffSaving, setStaffSaving] = useState(false);
  const [logoPhotoMode, setLogoPhotoMode] = useState<'link' | 'upload'>('link');
  const [logoPhotoUploading, setLogoPhotoUploading] = useState(false);
  const [pendingOrgLogoFile, setPendingOrgLogoFile] = useState<File | null>(null);
  const [pendingOrgLogoUrl, setPendingOrgLogoUrl] = useState<string | null>(null);
  const orgLogoFileRef = useRef<HTMLInputElement>(null);
  const pendingOrgLogoObjectUrlRef = useRef<string | null>(null);

  const [previewPhotoMode, setPreviewPhotoMode] = useState<'link' | 'upload'>('link');
  const [previewPhotoUploading, setPreviewPhotoUploading] = useState(false);
  const [pendingOrgPreviewFile, setPendingOrgPreviewFile] = useState<File | null>(null);
  const [pendingOrgPreviewUrl, setPendingOrgPreviewUrl] = useState<string | null>(null);
  const orgPreviewFileRef = useRef<HTMLInputElement>(null);
  const pendingOrgObjectUrlRef = useRef<string | null>(null);

  const revokePendingOrgLogo = () => {
    if (pendingOrgLogoObjectUrlRef.current) {
      URL.revokeObjectURL(pendingOrgLogoObjectUrlRef.current);
      pendingOrgLogoObjectUrlRef.current = null;
    }
    setPendingOrgLogoUrl(null);
  };

  const revokePendingOrgPreview = () => {
    if (pendingOrgObjectUrlRef.current) {
      URL.revokeObjectURL(pendingOrgObjectUrlRef.current);
      pendingOrgObjectUrlRef.current = null;
    }
    setPendingOrgPreviewUrl(null);
  };

  useEffect(() => {
    revokePendingOrgLogo();
    setPendingOrgLogoFile(null);
    revokePendingOrgPreview();
    setPendingOrgPreviewFile(null);
  }, [activeOrgId]);

  useEffect(() => {
    return () => {
      if (pendingOrgLogoObjectUrlRef.current) {
        URL.revokeObjectURL(pendingOrgLogoObjectUrlRef.current);
        pendingOrgLogoObjectUrlRef.current = null;
      }
      if (pendingOrgObjectUrlRef.current) {
        URL.revokeObjectURL(pendingOrgObjectUrlRef.current);
        pendingOrgObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedHostQ(draft.hostSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [draft.hostSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedStaffQ(staffAddSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [staffAddSearch]);

  const { data: hostResults = [] } = useSearchUsers(debouncedHostQ);
  const { data: staffSearchResults = [] } = useSearchUsers(debouncedStaffQ);

  const activeOrgIdForStaff =
    typeof activeOrgId === 'string' && activeOrgId !== 'new' && activeOrgId !== 'idle' ? activeOrgId : null;

  const { data: orgStaffRows = [], isLoading: orgStaffLoading } = useQuery({
    queryKey: ['org-staff-admin', activeOrgIdForStaff],
    enabled: !!activeOrgIdForStaff,
    queryFn: async () => {
      const orgId = activeOrgIdForStaff!;
      const { data, error } = await supabase
        .from('org_hosts')
        .select('id, user_id, role')
        .eq('org_id', orgId);
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

  const { data: ownerProfile } = useQuery({
    queryKey: ['admin-org-owner-profile', draft.owner_user_id],
    enabled: !!draft.owner_user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', draft.owner_user_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

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

  useEffect(() => {
    if (activeOrgId === 'idle' || activeOrgId === 'new') {
      setDraft(emptyDraft());
      return;
    }
    const org = orgs.find((o) => o.id === activeOrgId);
    if (org) setDraft(draftFromOrg(org));
  }, [activeOrgId, orgs]);

  const previewMapsUrl = mapsPreviewUrl(
    draft.google_maps_url || null,
    parseCoord(draft.latStr),
    parseCoord(draft.lngStr)
  );

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-4">
          <h1 className="text-center text-2xl font-black uppercase tracking-tight">Organizations</h1>
        </div>
        <div className="container px-4 py-8">
          <div className="mx-auto max-w-sm bg-foreground p-6 text-center text-background">
            <p className="mb-4 font-bold uppercase">Sign in to continue.</p>
            <Button type="button" variant="outline" className="btn-run" onClick={() => navigate('/profile')}>
              Go to profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
          <button type="button" onClick={() => navigate('/settings')} className="absolute left-0 p-2">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-black uppercase tracking-tight">Organizations</h1>
        </div>
        <div className="container px-4 py-8">
          <p className="text-center text-muted-foreground">You do not have access to this page.</p>
        </div>
      </div>
    );
  }

  const patchDraft = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const ORG_ROLE_LABEL: Record<string, string> = {
    owner: 'Primary owner',
    host: 'Host',
    manager: 'Manager',
    barista: 'Barista',
  };

  const handleAddStaffMember = async (userId: string) => {
    if (!activeOrgIdForStaff) return;
    setStaffSaving(true);
    try {
      const { error } = await supabase.from('org_hosts').insert({
        org_id: activeOrgIdForStaff,
        user_id: userId,
        role: staffAddRole,
      });
      if (error) throw error;
      setStaffAddSearch('');
      toast({ title: 'Staff added' });
      queryClient.invalidateQueries({ queryKey: ['org-staff-admin', activeOrgIdForStaff] });
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
    if (row.user_id === draft.owner_user_id && row.role === 'owner') {
      toast({
        title: 'Cannot remove primary owner',
        description: 'Assign a different primary owner first, then remove this row.',
        variant: 'destructive',
      });
      return;
    }
    setStaffSaving(true);
    try {
      const { error } = await supabase.from('org_hosts').delete().eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Removed' });
      queryClient.invalidateQueries({ queryKey: ['org-staff-admin', activeOrgIdForStaff] });
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

  const handleSelectOrg = (id: string) => {
    setActiveOrgId(id);
  };

  const handleNewOrg = () => {
    setActiveOrgId('new');
  };

  const handleOrgLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!PREVIEW_MIME.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please use JPEG, PNG, WebP, or GIF.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX_PREVIEW_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum size is 5MB.',
        variant: 'destructive',
      });
      return;
    }

    const existingOrgId =
      typeof activeOrgId === 'string' && activeOrgId !== 'new' && activeOrgId !== 'idle' ? activeOrgId : null;

    if (existingOrgId) {
      setLogoPhotoUploading(true);
      try {
        const url = await uploadOrgLogoToStorage(existingOrgId, file);
        patchDraft({ logo_url: url });
        setLogoPhotoMode('link');
        revokePendingOrgLogo();
        setPendingOrgLogoFile(null);
        toast({ title: 'Logo uploaded!' });
        refreshOrgRelatedQueries();
      } catch (err: unknown) {
        toast({
          title: 'Upload failed',
          description: err instanceof Error ? err.message : 'Could not upload logo.',
          variant: 'destructive',
        });
      } finally {
        setLogoPhotoUploading(false);
      }
    } else {
      revokePendingOrgLogo();
      setPendingOrgLogoFile(file);
      const url = URL.createObjectURL(file);
      pendingOrgLogoObjectUrlRef.current = url;
      setPendingOrgLogoUrl(url);
      patchDraft({ logo_url: '' });
    }
  };

  const handleOrgPreviewFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!PREVIEW_MIME.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please use JPEG, PNG, WebP, or GIF.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX_PREVIEW_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum size is 5MB.',
        variant: 'destructive',
      });
      return;
    }

    const existingOrgId =
      typeof activeOrgId === 'string' && activeOrgId !== 'new' && activeOrgId !== 'idle' ? activeOrgId : null;

    if (existingOrgId) {
      setPreviewPhotoUploading(true);
      try {
        const url = await uploadOrgPreviewToStorage(existingOrgId, file);
        patchDraft({ preview_photo_url: url });
        setPreviewPhotoMode('link');
        revokePendingOrgPreview();
        setPendingOrgPreviewFile(null);
        toast({ title: 'Photo uploaded!' });
        refreshOrgRelatedQueries();
      } catch (err: unknown) {
        toast({
          title: 'Upload failed',
          description: err instanceof Error ? err.message : 'Could not upload photo.',
          variant: 'destructive',
        });
      } finally {
        setPreviewPhotoUploading(false);
      }
    } else {
      revokePendingOrgPreview();
      setPendingOrgPreviewFile(file);
      const url = URL.createObjectURL(file);
      pendingOrgObjectUrlRef.current = url;
      setPendingOrgPreviewUrl(url);
      patchDraft({ preview_photo_url: '' });
    }
  };

  const clearOrgLogoPhoto = () => {
    patchDraft({ logo_url: '' });
    setPendingOrgLogoFile(null);
    revokePendingOrgLogo();
    if (orgLogoFileRef.current) orgLogoFileRef.current.value = '';
  };

  const clearOrgPreviewPhoto = () => {
    patchDraft({ preview_photo_url: '' });
    setPendingOrgPreviewFile(null);
    revokePendingOrgPreview();
    if (orgPreviewFileRef.current) orgPreviewFileRef.current.value = '';
  };

  const logoPhotoSrc = (pendingOrgLogoUrl || draft.logo_url.trim()) as string;
  const previewPhotoSrc = (pendingOrgPreviewUrl || draft.preview_photo_url.trim()) as string;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.org_name.trim();
    if (!name) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (!draft.owner_user_id) {
      toast({ title: 'Org host required', description: 'Search and select a user.', variant: 'destructive' });
      return;
    }

    const lat = parseCoord(draft.latStr);
    const lng = parseCoord(draft.lngStr);
    const openingPayload = weeklyToJson(draft.openingHours);

    const logoUrlForRow =
      pendingOrgLogoFile && activeOrgId === 'new' ? null : draft.logo_url.trim() || null;
    const previewUrlForRow =
      pendingOrgPreviewFile && activeOrgId === 'new' ? null : draft.preview_photo_url.trim() || null;

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
      logo_url: logoUrlForRow,
      preview_photo_url: previewUrlForRow,
      owner_user_id: draft.owner_user_id,
    };

    setSaving(true);
    try {
      if (activeOrgId === 'new') {
        const { data: inserted, error: insErr } = await supabase
          .from('orgs')
          .insert(row)
          .select('id')
          .single();
        if (insErr) throw insErr;
        const orgId = inserted?.id;
        if (!orgId) throw new Error('No org id returned');

        const { error: hostErr } = await supabase.from('org_hosts').insert({
          org_id: orgId,
          user_id: draft.owner_user_id,
          role: 'owner',
        });
        if (hostErr) throw hostErr;

        let finalPreviewUrl = previewUrlForRow;
        if (pendingOrgPreviewFile) {
          const uploaded = await uploadOrgPreviewToStorage(orgId, pendingOrgPreviewFile);
          const { error: photoErr } = await supabase
            .from('orgs')
            .update({ preview_photo_url: uploaded })
            .eq('id', orgId);
          if (photoErr) throw photoErr;
          finalPreviewUrl = uploaded;
        }

        let finalLogoUrl = logoUrlForRow;
        if (pendingOrgLogoFile) {
          const uploaded = await uploadOrgLogoToStorage(orgId, pendingOrgLogoFile);
          const { error: logoErr } = await supabase.from('orgs').update({ logo_url: uploaded }).eq('id', orgId);
          if (logoErr) throw logoErr;
          finalLogoUrl = uploaded;
        }

        revokePendingOrgPreview();
        setPendingOrgPreviewFile(null);
        if (orgPreviewFileRef.current) orgPreviewFileRef.current.value = '';
        if (finalPreviewUrl) patchDraft({ preview_photo_url: finalPreviewUrl });

        revokePendingOrgLogo();
        setPendingOrgLogoFile(null);
        if (orgLogoFileRef.current) orgLogoFileRef.current.value = '';
        if (finalLogoUrl) patchDraft({ logo_url: finalLogoUrl });

        toast({ title: 'Organization created' });
        refreshOrgRelatedQueries();
        setActiveOrgId(orgId);
      } else if (typeof activeOrgId === 'string') {
        const orgId = activeOrgId;

        const { error: upErr } = await supabase.from('orgs').update(row).eq('id', orgId);
        if (upErr) throw upErr;

        const { error: delErr } = await supabase
          .from('org_hosts')
          .delete()
          .eq('org_id', orgId)
          .eq('role', 'owner');
        if (delErr) throw delErr;

        const { data: hostRow } = await supabase
          .from('org_hosts')
          .select('id')
          .eq('org_id', orgId)
          .eq('user_id', draft.owner_user_id)
          .maybeSingle();

        if (hostRow?.id) {
          const { error: promoteErr } = await supabase
            .from('org_hosts')
            .update({ role: 'owner' })
            .eq('id', hostRow.id);
          if (promoteErr) throw promoteErr;
        } else {
          const { error: hostErr } = await supabase.from('org_hosts').insert({
            org_id: orgId,
            user_id: draft.owner_user_id,
            role: 'owner',
          });
          if (hostErr) throw hostErr;
        }

        toast({ title: 'Organization updated' });
        refreshOrgRelatedQueries();
      }
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
        <button type="button" onClick={() => navigate('/settings')} className="absolute left-0 p-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-black uppercase tracking-tight">Organizations</h1>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">All organizations</h2>
            <Button type="button" size="sm" onClick={handleNewOrg}>
              New organization
            </Button>
          </div>
          {orgsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations yet.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {orgs.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectOrg(o.id)}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted ${
                      activeOrgId === o.id ? 'bg-muted' : ''
                    }`}
                  >
                    {o.logo_url || o.preview_photo_url ? (
                      <img
                        src={(o.logo_url || o.preview_photo_url) as string}
                        alt=""
                        className="mt-0.5 h-10 w-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/50">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      {o.org_name}
                      {o.mtr_station ? (
                        <span className="block text-xs font-normal text-muted-foreground">{o.mtr_station}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {activeOrgId === 'idle' ? (
          <p className="text-center text-sm text-muted-foreground">
            Select an organization to edit, or create a new one.
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/org/${activeOrgId}/menu`)}>
                Menu &amp; campaigns
              </Button>
            </div>
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase text-foreground">Core info</h3>
              <div className="space-y-2">
                <Label htmlFor="org_name">Name</Label>
                <Input
                  id="org_name"
                  value={draft.org_name}
                  onChange={(e) => patchDraft({ org_name: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Address</Label>
                <Input
                  id="location"
                  value={draft.location}
                  onChange={(e) => patchDraft({ location: e.target.value })}
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
                    placeholder="22.2783"
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
                    placeholder="114.1747"
                    className="h-11"
                  />
                </div>
              </div>
              {mapCoordHint ? (
                <p className="text-sm text-muted-foreground">{mapCoordHint}</p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram handle</Label>
                <Input
                  id="instagram"
                  value={draft.instagram_handle}
                  onChange={(e) => patchDraft({ instagram_handle: e.target.value })}
                  placeholder="@yourcafe"
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
                    <TabsTrigger type="button" value="link">
                      Image URL
                    </TabsTrigger>
                    <TabsTrigger type="button" value="upload">
                      Upload
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="link" className="mt-3 space-y-2">
                    <Input
                      value={draft.logo_url}
                      onChange={(e) => {
                        revokePendingOrgLogo();
                        setPendingOrgLogoFile(null);
                        patchDraft({ logo_url: e.target.value });
                      }}
                      placeholder="https://…"
                      className="h-11"
                      type="url"
                      autoComplete="off"
                    />
                  </TabsContent>
                  <TabsContent value="upload" className="mt-3 space-y-2">
                    <input
                      ref={orgLogoFileRef}
                      type="file"
                      accept={PREVIEW_MIME.join(',')}
                      className="hidden"
                      onChange={handleOrgLogoFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={logoPhotoUploading}
                      onClick={() => orgLogoFileRef.current?.click()}
                    >
                      {logoPhotoUploading
                        ? 'Uploading…'
                        : activeOrgId === 'new'
                          ? 'Choose logo (uploads after save)'
                          : 'Choose logo'}
                    </Button>
                    {activeOrgId === 'new' ? (
                      <p className="text-xs text-muted-foreground">
                        For a new organization, the file is uploaded right after the org is created.
                      </p>
                    ) : null}
                  </TabsContent>
                </Tabs>
                {logoPhotoSrc ? (
                  <div className="relative mx-auto w-32 overflow-hidden rounded-lg border border-border">
                    <img src={logoPhotoSrc} alt="" className="aspect-square w-full object-cover" />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute right-1 top-1 gap-1 px-2 py-1 text-xs shadow-sm"
                      onClick={clearOrgLogoPhoto}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
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
                    <TabsTrigger type="button" value="link">
                      Image URL
                    </TabsTrigger>
                    <TabsTrigger type="button" value="upload">
                      Upload
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="link" className="mt-3 space-y-2">
                    <Input
                      value={draft.preview_photo_url}
                      onChange={(e) => {
                        revokePendingOrgPreview();
                        setPendingOrgPreviewFile(null);
                        patchDraft({ preview_photo_url: e.target.value });
                      }}
                      placeholder="https://…"
                      className="h-11"
                      type="url"
                      autoComplete="off"
                    />
                  </TabsContent>
                  <TabsContent value="upload" className="mt-3 space-y-2">
                    <input
                      ref={orgPreviewFileRef}
                      type="file"
                      accept={PREVIEW_MIME.join(',')}
                      className="hidden"
                      onChange={handleOrgPreviewFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={previewPhotoUploading}
                      onClick={() => orgPreviewFileRef.current?.click()}
                    >
                      {previewPhotoUploading
                        ? 'Uploading…'
                        : activeOrgId === 'new'
                          ? 'Choose photo (uploads after save)'
                          : 'Choose photo'}
                    </Button>
                    {activeOrgId === 'new' ? (
                      <p className="text-xs text-muted-foreground">
                        For a new organization, the file is uploaded right after the org is created.
                      </p>
                    ) : null}
                  </TabsContent>
                </Tabs>
                {previewPhotoSrc ? (
                  <div className="relative overflow-hidden rounded-lg border border-border">
                    <img src={previewPhotoSrc} alt="" className="aspect-video w-full object-cover" />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute right-2 top-2 gap-1 shadow-sm"
                      onClick={clearOrgPreviewPhoto}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gmaps">Google Maps link</Label>
                <Input
                  id="gmaps"
                  value={draft.google_maps_url}
                  onChange={(e) => patchDraft({ google_maps_url: e.target.value })}
                  placeholder="https://maps.google.com/..."
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
                  disabled={!draft.district}
                  value={draft.mtr_station ? draft.mtr_station : '__none__'}
                  onValueChange={(v) => patchDraft({ mtr_station: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger id="mtr" className="h-11">
                    <SelectValue
                      placeholder={draft.district ? 'Station' : 'Select a district first'}
                    />
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
                {!draft.district ? (
                  <p className="text-xs text-muted-foreground">
                    Select a district first to choose an MTR station.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase text-foreground">Org host</h3>
              <div className="space-y-2">
                <Label htmlFor="host-search">Search user by username</Label>
                <Input
                  id="host-search"
                  value={draft.hostSearch}
                  onChange={(e) => patchDraft({ hostSearch: e.target.value })}
                  placeholder="At least 2 characters"
                  className="h-11"
                  autoComplete="off"
                />
                {hostResults.length > 0 ? (
                  <ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-background text-sm">
                    {hostResults.map((u) => (
                      <li key={u.user_id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted"
                          onClick={() =>
                            patchDraft({
                              owner_user_id: u.user_id,
                              hostSearch: u.username,
                            })
                          }
                        >
                          {u.username}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {draft.owner_user_id ? (
                  <p className="text-sm text-muted-foreground">
                    Selected:{' '}
                    <span className="font-medium text-foreground">
                      {ownerProfile?.username ?? draft.hostSearch ?? draft.owner_user_id}
                    </span>
                  </p>
                ) : null}
              </div>
            </section>

            {activeOrgIdForStaff ? (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase text-foreground">Staff (this organization)</h3>
                <p className="text-xs text-muted-foreground">
                  Primary owner is set above. Add Host, Manager, or Barista roles for other accounts. Removing all
                  assignments for a user restores their global role to regular user.
                </p>
                {orgStaffLoading ? (
                  <p className="text-sm text-muted-foreground">Loading staff…</p>
                ) : orgStaffRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No staff rows yet.</p>
                ) : (
                  <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-sm">
                    {orgStaffRows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/80"
                      >
                        <span className="min-w-0">
                          <span className="font-medium">{row.username}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {ORG_ROLE_LABEL[row.role] ?? row.role}
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-destructive"
                          disabled={staffSaving}
                          onClick={() => handleRemoveStaffMember(row)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-2">
                  <Label htmlFor="staff-search">Add staff by username</Label>
                  <Input
                    id="staff-search"
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

            <Button type="submit" className="w-full btn-run" disabled={saving}>
              {saving ? 'Saving…' : activeOrgId === 'new' ? 'Create organization' : 'Save changes'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
