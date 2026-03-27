import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin } from 'lucide-react';
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
import { HK_MTR_STATIONS } from '@/data/hkMtrStations';

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
    owner_user_id: org.owner_user_id ?? '',
    hostSearch: '',
  };
}

export default function AdminOrgsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: orgs = [], isLoading: orgsLoading } = useOrgs();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeOrgId, setActiveOrgId] = useState<string | null | 'new' | 'idle'>('idle');
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [debouncedHostQ, setDebouncedHostQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedHostQ(draft.hostSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [draft.hostSearch]);

  const { data: hostResults = [] } = useSearchUsers(debouncedHostQ);

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

  const mtrSuggestions = useMemo(() => {
    const q = draft.mtr_station.trim().toLowerCase();
    if (!q) return [] as readonly string[];
    return HK_MTR_STATIONS.filter((s) => s.toLowerCase().includes(q)).slice(0, 12);
  }, [draft.mtr_station]);

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
          <button type="button" onClick={() => navigate('/profile')} className="absolute left-0 p-2">
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

  const handleSelectOrg = (id: string) => {
    setActiveOrgId(id);
  };

  const handleNewOrg = () => {
    setActiveOrgId('new');
  };

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

        toast({ title: 'Organization created' });
        queryClient.invalidateQueries({ queryKey: ['orgs'] });
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
        queryClient.invalidateQueries({ queryKey: ['orgs'] });
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
        <button type="button" onClick={() => navigate('/profile')} className="absolute left-0 p-2" aria-label="Back">
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
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted ${
                      activeOrgId === o.id ? 'bg-muted' : ''
                    }`}
                  >
                    {o.org_name}
                    {o.mtr_station ? (
                      <span className="block text-xs font-normal text-muted-foreground">{o.mtr_station}</span>
                    ) : null}
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
                  onValueChange={(v) => patchDraft({ district: v === '__none__' ? '' : v })}
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
                <Input
                  id="mtr"
                  value={draft.mtr_station}
                  onChange={(e) => patchDraft({ mtr_station: e.target.value })}
                  placeholder="Start typing a station name"
                  className="h-11"
                  autoComplete="off"
                />
                {mtrSuggestions.length > 0 ? (
                  <ul className="max-h-36 overflow-y-auto rounded-md border border-border bg-background text-sm">
                    {mtrSuggestions.map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted"
                          onClick={() => patchDraft({ mtr_station: s })}
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
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

            <Button type="submit" className="w-full btn-run" disabled={saving}>
              {saving ? 'Saving…' : activeOrgId === 'new' ? 'Create organization' : 'Save changes'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
