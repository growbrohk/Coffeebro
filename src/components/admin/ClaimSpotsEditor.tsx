import { useMemo, useRef, useState } from 'react';
import { ChevronsUpDown, MapPin, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  useOrgClaimSpots,
  useCreateClaimSpot,
  useDeleteClaimSpot,
  useUpdateClaimSpot,
  type OrgClaimSpotRow,
} from '@/hooks/useOrgClaimSpots';
import { useDiscoveryOrgs, type DiscoveryOrgRow } from '@/hooks/useDiscoveryOrgs';
import { useToast } from '@/hooks/use-toast';
import { TreasureMapPickerDialog } from '@/components/campaigns/TreasureMapPickerDialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type Props = {
  orgId: string;
  disabled?: boolean;
};

type Draft = {
  label: string;
  address: string;
  latStr: string;
  lngStr: string;
  google_maps_url: string;
};

type DraftKey = string;

type PublicOrgRow = {
  org_name: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  google_maps_url: string | null;
};

const emptyDraft = (): Draft => ({
  label: '',
  address: '',
  latStr: '',
  lngStr: '',
  google_maps_url: '',
});

function parseCoord(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function rowToDraft(row: OrgClaimSpotRow): Draft {
  return {
    label: row.label ?? '',
    address: row.address ?? '',
    latStr: row.lat != null ? String(row.lat) : '',
    lngStr: row.lng != null ? String(row.lng) : '',
    google_maps_url: row.google_maps_url ?? '',
  };
}

function filterDiscoveryCandidates(rows: DiscoveryOrgRow[], currentOrgId: string): DiscoveryOrgRow[] {
  return rows.filter(
    (o) =>
      o.shop_type === 'physical' &&
      o.id !== currentOrgId &&
      (!!o.location?.trim() || (o.lat != null && o.lng != null)),
  );
}

function filterBySearch(rows: DiscoveryOrgRow[], q: string): DiscoveryOrgRow[] {
  const trimmed = q.trim().toLowerCase();
  let list = rows;
  if (trimmed) {
    list = rows.filter((o) => {
      const hay = [o.org_name, o.district, o.mtr_station, o.location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(trimmed);
    });
  }
  return [...list].sort((a, b) => a.org_name.localeCompare(b.org_name));
}

function applyPublicRowToDraft(draft: Draft, row: PublicOrgRow): Partial<Draft> {
  const patch: Partial<Draft> = {};
  const loc = row.location?.trim();
  if (loc) patch.address = loc;
  if (row.lat != null && row.lng != null) {
    patch.latStr = String(row.lat);
    patch.lngStr = String(row.lng);
  }
  const g = row.google_maps_url?.trim();
  if (g) patch.google_maps_url = g;
  if (!draft.label.trim() && row.org_name) patch.label = row.org_name;
  return patch;
}

export function ClaimSpotsEditor({ orgId, disabled }: Props) {
  const { data: spots = [], isLoading } = useOrgClaimSpots(orgId);
  const { data: discovery = [] } = useDiscoveryOrgs();
  const createSpot = useCreateClaimSpot();
  const updateSpot = useUpdateClaimSpot();
  const deleteSpot = useDeleteClaimSpot();
  const { toast } = useToast();

  const candidates = useMemo(() => filterDiscoveryCandidates(discovery, orgId), [discovery, orgId]);

  const [editing, setEditing] = useState<Record<string, Draft>>({});
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft());
  const [adding, setAdding] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | 'new' | null>(null);

  const [modeByDraft, setModeByDraft] = useState<Record<DraftKey, 'manual' | 'fromOrg'>>({});
  const [orgPickerOpen, setOrgPickerOpen] = useState<Record<DraftKey, boolean>>({});
  const [orgPickerBusy, setOrgPickerBusy] = useState<Record<DraftKey, boolean>>({});
  const [orgSearch, setOrgSearch] = useState<Record<DraftKey, string>>({});
  const reqIdsRef = useRef<Record<DraftKey, number>>({});

  const getMode = (key: DraftKey) => modeByDraft[key] ?? 'manual';

  const clearDraftContext = (key: DraftKey) => {
    setModeByDraft((m) => {
      const n = { ...m };
      delete n[key];
      return n;
    });
    setOrgPickerOpen((o) => {
      const n = { ...o };
      delete n[key];
      return n;
    });
    setOrgPickerBusy((b) => {
      const n = { ...b };
      delete n[key];
      return n;
    });
    setOrgSearch((s) => {
      const n = { ...s };
      delete n[key];
      return n;
    });
  };

  const applyOrgToDraft = async (draftKey: DraftKey, orgIdToFetch: string) => {
    reqIdsRef.current[draftKey] = (reqIdsRef.current[draftKey] ?? 0) + 1;
    const token = reqIdsRef.current[draftKey];
    setOrgPickerBusy((b) => ({ ...b, [draftKey]: true }));
    setOrgPickerOpen((o) => ({ ...o, [draftKey]: false }));
    try {
      const { data, error } = await supabase.rpc('get_public_org_by_id', { p_org_id: orgIdToFetch });
      if (error) throw error;
      const row = data?.[0] as PublicOrgRow | undefined;
      if (!row) {
        toast({
          title: 'Could not load organization',
          description: 'No data returned for this org.',
          variant: 'destructive',
        });
        return;
      }
      if (reqIdsRef.current[draftKey] !== token) return;

      if (draftKey === 'new') {
        setNewDraft((prev) => {
          if (reqIdsRef.current[draftKey] !== token) return prev;
          return { ...prev, ...applyPublicRowToDraft(prev, row) };
        });
      } else {
        setEditing((prev) => {
          const cur = prev[draftKey];
          if (!cur) return prev;
          if (reqIdsRef.current[draftKey] !== token) return prev;
          return { ...prev, [draftKey]: { ...cur, ...applyPublicRowToDraft(cur, row) } };
        });
      }
      toast({ title: `Filled from ${row.org_name}` });
    } catch (e) {
      if (reqIdsRef.current[draftKey] !== token) return;
      toast({
        title: 'Could not load organization',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      if (reqIdsRef.current[draftKey] === token) {
        setOrgPickerBusy((b) => ({ ...b, [draftKey]: false }));
      }
    }
  };

  const beginEdit = (row: OrgClaimSpotRow) => {
    setEditing((prev) => ({ ...prev, [row.id]: rowToDraft(row) }));
  };

  const cancelEdit = (id: string) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    clearDraftContext(id);
  };

  const patchEdit = (id: string, patch: Partial<Draft>) => {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? emptyDraft()), ...patch },
    }));
  };

  const validateDraft = (d: Draft): string | null => {
    if (!d.label.trim()) return 'Label is required.';
    const lat = parseCoord(d.latStr);
    const lng = parseCoord(d.lngStr);
    const hasLat = d.latStr.trim().length > 0;
    const hasLng = d.lngStr.trim().length > 0;
    if (hasLat !== hasLng) return 'Provide both latitude and longitude (or leave both blank).';
    if (lat != null && (lat < -90 || lat > 90)) return 'Latitude out of range.';
    if (lng != null && (lng < -180 || lng > 180)) return 'Longitude out of range.';
    return null;
  };

  const draftToPayload = (d: Draft) => {
    const lat = parseCoord(d.latStr);
    const lng = parseCoord(d.lngStr);
    return {
      label: d.label.trim(),
      address: d.address.trim() || null,
      lat,
      lng,
      google_maps_url: d.google_maps_url.trim() || null,
    };
  };

  const handleSaveExisting = async (row: OrgClaimSpotRow) => {
    const draft = editing[row.id];
    if (!draft) return;
    const err = validateDraft(draft);
    if (err) {
      toast({ title: 'Fix claim spot', description: err, variant: 'destructive' });
      return;
    }
    try {
      await updateSpot.mutateAsync({
        id: row.id,
        orgId: row.org_id,
        patch: draftToPayload(draft),
      });
      cancelEdit(row.id);
      toast({ title: 'Spot updated' });
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = async () => {
    const err = validateDraft(newDraft);
    if (err) {
      toast({ title: 'Fix claim spot', description: err, variant: 'destructive' });
      return;
    }
    try {
      await createSpot.mutateAsync({
        org_id: orgId,
        sort_order: spots.length,
        ...draftToPayload(newDraft),
      });
      setNewDraft(emptyDraft());
      setAdding(false);
      clearDraftContext('new');
      toast({ title: 'Spot added' });
    } catch (e) {
      toast({
        title: 'Add failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (row: OrgClaimSpotRow) => {
    if (!confirm(`Remove claim spot "${row.label}"? Active campaigns linked to it will lose their pickup pin.`)) return;
    try {
      await deleteSpot.mutateAsync({ id: row.id, orgId: row.org_id });
      cancelEdit(row.id);
      toast({ title: 'Spot removed' });
    } catch (e) {
      toast({
        title: 'Remove failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const renderDraftFields = (draftKey: DraftKey, draft: Draft, patch: (p: Partial<Draft>) => void) => {
    const mode = getMode(draftKey);
    const search = orgSearch[draftKey] ?? '';
    const filtered = filterBySearch(candidates, search);
    const pickerOpen = Boolean(orgPickerOpen[draftKey]);
    const pickerBusy = Boolean(orgPickerBusy[draftKey]);
    const triggerId = `claim-spot-org-trigger-${draftKey}`;
    const listId = `claim-spot-org-list-${draftKey}`;

    return (
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === 'manual' ? 'secondary' : 'ghost'}
            disabled={disabled}
            onClick={() => {
              setModeByDraft((m) => ({ ...m, [draftKey]: 'manual' }));
              setOrgPickerOpen((o) => ({ ...o, [draftKey]: false }));
            }}
          >
            Manual entry
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'fromOrg' ? 'secondary' : 'ghost'}
            disabled={disabled}
            onClick={() => setModeByDraft((m) => ({ ...m, [draftKey]: 'fromOrg' }))}
          >
            Copy from organization
          </Button>
        </div>

        {mode === 'fromOrg' ? (
          <div className="space-y-1.5">
            <Label htmlFor={triggerId}>Organization</Label>
            <Popover
              open={pickerOpen}
              onOpenChange={(open) => {
                setOrgPickerOpen((o) => ({ ...o, [draftKey]: open }));
                if (!open) setOrgSearch((s) => ({ ...s, [draftKey]: '' }));
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  id={triggerId}
                  role="combobox"
                  aria-expanded={pickerOpen}
                  aria-controls={listId}
                  aria-busy={pickerBusy}
                  variant="outline"
                  disabled={disabled || pickerBusy}
                  className={cn('h-10 w-full justify-between font-normal', !pickerBusy && 'bg-background')}
                >
                  <span className="truncate text-left">
                    {pickerBusy ? 'Loading…' : 'Search organizations…'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                id={listId}
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search by name, area…"
                    value={search}
                    onValueChange={(v) => setOrgSearch((s) => ({ ...s, [draftKey]: v }))}
                  />
                  <CommandList>
                    <CommandEmpty>No organization found.</CommandEmpty>
                    <CommandGroup>
                      {filtered.map((o) => (
                        <CommandItem
                          key={o.id}
                          value={`${o.org_name}|${o.id}`}
                          onSelect={() => {
                            void applyOrgToDraft(draftKey, o.id);
                          }}
                        >
                          <span className="truncate">{o.org_name}</span>
                          {o.district ? (
                            <span className="ml-2 shrink-0 text-xs text-muted-foreground">{o.district}</span>
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Pick an org to fill address, coordinates, and Google Maps link. You can edit them below.
            </p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor={`spot-label-${draftKey}`}>Label</Label>
          <Input
            id={`spot-label-${draftKey}`}
            value={draft.label}
            onChange={(e) => patch({ label: e.target.value })}
            placeholder="e.g. Central pickup counter"
            disabled={disabled}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`spot-address-${draftKey}`}>Address</Label>
          <Input
            id={`spot-address-${draftKey}`}
            value={draft.address}
            onChange={(e) => patch({ address: e.target.value })}
            placeholder="Building, street, district"
            disabled={disabled}
            className="h-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`spot-lat-${draftKey}`}>Latitude</Label>
            <Input
              id={`spot-lat-${draftKey}`}
              inputMode="decimal"
              value={draft.latStr}
              onChange={(e) => patch({ latStr: e.target.value })}
              placeholder="22.2783"
              disabled={disabled}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`spot-lng-${draftKey}`}>Longitude</Label>
            <Input
              id={`spot-lng-${draftKey}`}
              inputMode="decimal"
              value={draft.lngStr}
              onChange={(e) => patch({ lngStr: e.target.value })}
              placeholder="114.1747"
              disabled={disabled}
              className="h-10"
            />
          </div>
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled}
            onClick={() => setPickerFor(draftKey)}
          >
            <MapPin className="h-4 w-4" />
            Pick on map
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`spot-gmaps-${draftKey}`}>Google Maps link (optional)</Label>
          <Input
            id={`spot-gmaps-${draftKey}`}
            type="url"
            value={draft.google_maps_url}
            onChange={(e) => patch({ google_maps_url: e.target.value })}
            placeholder="https://maps.app.goo.gl/…"
            disabled={disabled}
            className="h-10"
          />
        </div>
        {pickerFor === draftKey ? (
          <TreasureMapPickerDialog
            open={pickerFor === draftKey}
            onOpenChange={(open) => {
              if (!open) setPickerFor(null);
            }}
            initialLat={draft.latStr}
            initialLng={draft.lngStr}
            disabled={disabled}
            onApply={({ lat, lng, address }) => {
              patch({
                latStr: lat,
                lngStr: lng,
                address: draft.address.trim() || address,
              });
            }}
          />
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold tracking-normal text-foreground">Claim spots</h4>
        <p className="text-xs text-muted-foreground">
          Online shops use claim spots as pickup locations. Map pins and voucher directions for each campaign use the
          spot you assign in the campaign editor.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading claim spots…</p>
      ) : spots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No claim spots yet. Add at least one before publishing campaigns.</p>
      ) : (
        <ul className="space-y-3">
          {spots.map((row) => {
            const draft = editing[row.id];
            const isEditing = Boolean(draft);
            return (
              <li key={row.id} className="rounded-lg border border-border bg-card/40 p-3">
                {isEditing && draft ? (
                  <div className="space-y-3">
                    {renderDraftFields(row.id, draft, (p) => patchEdit(row.id, p))}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveExisting(row)}
                        disabled={disabled || updateSpot.isPending}
                      >
                        {updateSpot.isPending ? 'Saving…' : 'Save spot'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelEdit(row.id)}
                        disabled={disabled || updateSpot.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive"
                        onClick={() => handleDelete(row)}
                        disabled={disabled || deleteSpot.isPending}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{row.label}</p>
                      {row.address ? (
                        <p className="text-xs text-muted-foreground">{row.address}</p>
                      ) : null}
                      {row.lat != null && row.lng != null ? (
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {row.lat.toFixed(5)}, {row.lng.toFixed(5)}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600">Missing coordinates — pin will not show.</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => beginEdit(row)}
                        disabled={disabled}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(row)}
                        disabled={disabled || deleteSpot.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <div className="space-y-3">
            {renderDraftFields('new', newDraft, (p) => setNewDraft((prev) => ({ ...prev, ...p })))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleCreate}
                disabled={disabled || createSpot.isPending}
              >
                {createSpot.isPending ? 'Saving…' : 'Add spot'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setNewDraft(emptyDraft());
                  clearDraftContext('new');
                }}
                disabled={disabled || createSpot.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled}
          onClick={() => setAdding(true)}
        >
          <Plus className="h-4 w-4" />
          Add claim spot
        </Button>
      )}
    </div>
  );
}
