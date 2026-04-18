import { useState } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useOrgClaimSpots,
  useCreateClaimSpot,
  useDeleteClaimSpot,
  useUpdateClaimSpot,
  type OrgClaimSpotRow,
} from '@/hooks/useOrgClaimSpots';
import { useToast } from '@/hooks/use-toast';
import { TreasureMapPickerDialog } from '@/components/campaigns/TreasureMapPickerDialog';

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

export function ClaimSpotsEditor({ orgId, disabled }: Props) {
  const { data: spots = [], isLoading } = useOrgClaimSpots(orgId);
  const createSpot = useCreateClaimSpot();
  const updateSpot = useUpdateClaimSpot();
  const deleteSpot = useDeleteClaimSpot();
  const { toast } = useToast();

  const [editing, setEditing] = useState<Record<string, Draft>>({});
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft());
  const [adding, setAdding] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | 'new' | null>(null);

  const beginEdit = (row: OrgClaimSpotRow) => {
    setEditing((prev) => ({ ...prev, [row.id]: rowToDraft(row) }));
  };

  const cancelEdit = (id: string) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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

  const renderDraftFields = (
    id: string | 'new',
    draft: Draft,
    patch: (p: Partial<Draft>) => void,
  ) => (
    <div className="grid gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`spot-label-${id}`}>Label</Label>
        <Input
          id={`spot-label-${id}`}
          value={draft.label}
          onChange={(e) => patch({ label: e.target.value })}
          placeholder="e.g. Central pickup counter"
          disabled={disabled}
          className="h-10"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`spot-address-${id}`}>Address</Label>
        <Input
          id={`spot-address-${id}`}
          value={draft.address}
          onChange={(e) => patch({ address: e.target.value })}
          placeholder="Building, street, district"
          disabled={disabled}
          className="h-10"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`spot-lat-${id}`}>Latitude</Label>
          <Input
            id={`spot-lat-${id}`}
            inputMode="decimal"
            value={draft.latStr}
            onChange={(e) => patch({ latStr: e.target.value })}
            placeholder="22.2783"
            disabled={disabled}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`spot-lng-${id}`}>Longitude</Label>
          <Input
            id={`spot-lng-${id}`}
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
          onClick={() => setPickerFor(id)}
        >
          <MapPin className="h-4 w-4" />
          Pick on map
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`spot-gmaps-${id}`}>Google Maps link (optional)</Label>
        <Input
          id={`spot-gmaps-${id}`}
          type="url"
          value={draft.google_maps_url}
          onChange={(e) => patch({ google_maps_url: e.target.value })}
          placeholder="https://maps.app.goo.gl/…"
          disabled={disabled}
          className="h-10"
        />
      </div>
      {pickerFor === id ? (
        <TreasureMapPickerDialog
          open={pickerFor === id}
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
