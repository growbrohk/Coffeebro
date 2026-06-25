import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronsUpDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useTastingPackage } from '@/hooks/usePublishedTastingPackages';
import { useTastingPackageMutations, useDeleteTastingPackage } from '@/hooks/useTastingPackageMutations';
import { useOrgs } from '@/hooks/useOrgs';
import { useOrgMenuItems } from '@/hooks/useOrgMenuItems';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { LocationMultiSelect } from '@/components/admin/LocationMultiSelect';
import { HK_AREA_OPTIONS, getDistrictsForAreas } from '@/data/hkLocation';
import { getMtrStationsForDistricts, pruneLocationSelection } from '@/data/mtrStationsByDistrict';
import {
  filterOrgsForPackage,
  formatOrgOptionLabel,
  orgMatchesPackageLocation,
} from '@/lib/filterOrgsByLocation';
import { useToast } from '@/hooks/use-toast';
import type { TastingPackageEditorDraft, TastingPackageShopDraft } from '@/types/tastingPackage';
import {
  TASTING_DUO_MAX_SHOPS,
  TASTING_DUO_PORTIONS,
  TASTING_SINGLE_MAX_SHOPS,
  TASTING_SINGLE_PORTIONS,
} from '@/types/tastingPackage';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

function newClientId() {
  return crypto.randomUUID();
}

function emptyDraft(): TastingPackageEditorDraft {
  return {
    title: '',
    description: '',
    hk_areas: [],
    districts: [],
    mtr_stations: [],
    cover_image_url: '',
    status: 'draft',
    singleShops: [],
    duoShops: [],
  };
}

type OrgOption = {
  id: string;
  label: string;
  org_name: string;
};

function ShopRowEditor({
  shop,
  tier,
  orgOptions,
  orgById,
  onChange,
  onRemove,
}: {
  shop: TastingPackageShopDraft;
  tier: 'single' | 'duo';
  orgOptions: OrgOption[];
  orgById: Map<string, OrgOption>;
  onChange: (next: TastingPackageShopDraft) => void;
  onRemove: () => void;
}) {
  const portions = tier === 'single' ? TASTING_SINGLE_PORTIONS : TASTING_DUO_PORTIONS;
  const { data: menuItems = [] } = useOrgMenuItems(shop.org_id || undefined);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const menuIds = useMemo(() => {
    const ids = [...shop.menu_item_ids];
    while (ids.length < portions) ids.push('');
    return ids.slice(0, portions);
  }, [shop.menu_item_ids, portions]);

  const selectedLabel =
    (shop.org_id && orgById.get(shop.org_id)?.label) ||
    (shop.org_id && shop.org_name ? shop.org_name : undefined);

  const orgOutOfScope =
    Boolean(shop.org_id) && !orgOptions.some((o) => o.id === shop.org_id);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Label className="text-xs">Coffee shop</Label>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className={cn(
                  'h-10 w-full justify-between font-normal',
                  orgOutOfScope && 'border-destructive',
                )}
              >
                <span className="truncate">{selectedLabel ?? 'Select shop'}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search shop…" />
                <CommandList>
                  <CommandEmpty>No shop found.</CommandEmpty>
                  <CommandGroup>
                    {orgOptions.map((o) => (
                      <CommandItem
                        key={o.id}
                        value={o.label}
                        onSelect={() => {
                          onChange({
                            ...shop,
                            org_id: o.id,
                            org_name: o.org_name,
                            menu_item_ids: Array(portions).fill(''),
                          });
                          setComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            shop.org_id === o.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {o.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {orgOutOfScope ? (
            <p className="text-xs text-destructive">
              Selected shop is outside the chosen MTR stations / districts.
            </p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remove shop">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {Array.from({ length: portions }, (_, i) => (
        <div key={i} className="space-y-1">
          <Label className="text-xs">Tasting drink {portions > 1 ? i + 1 : ''}</Label>
          <Select
            value={menuIds[i] || undefined}
            disabled={!shop.org_id}
            onValueChange={(menuItemId) => {
              const next = [...menuIds];
              next[i] = menuItemId;
              onChange({ ...shop, menu_item_ids: next });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select menu item" />
            </SelectTrigger>
            <SelectContent>
              {menuItems.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.item_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

export default function AdminTastingPackageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new' || !id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const { data: existing } = useTastingPackage(isNew ? undefined : id);
  const { data: orgs = [] } = useOrgs();
  const saveMutation = useTastingPackageMutations();
  const deleteMutation = useDeleteTastingPackage();

  const [draft, setDraft] = useState<TastingPackageEditorDraft>(emptyDraft);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!existing || isNew) return;

    setDraft({
      title: existing.title,
      description: existing.description ?? '',
      hk_areas: existing.hk_areas ?? [],
      districts: existing.districts ?? [],
      mtr_stations: existing.mtr_stations ?? [],
      cover_image_url: existing.cover_image_url ?? '',
      status: existing.status as 'draft' | 'published',
      singleShops: [],
      duoShops: [],
    });

    void (async () => {
      const { data } = await supabase
        .from('tasting_package_shops')
        .select('id, tier, org_id, tasting_package_items ( menu_item_id, portion_index )')
        .eq('package_id', existing.id);
      if (!data) return;

      const singleShops: TastingPackageShopDraft[] = [];
      const duoShops: TastingPackageShopDraft[] = [];

      for (const row of data) {
        const rawItems = row.tasting_package_items;
        const items = (Array.isArray(rawItems) ? rawItems : []) as { menu_item_id: string; portion_index: number }[];
        const menuIds = items.sort((a, b) => a.portion_index - b.portion_index).map((it) => it.menu_item_id);
        const shopDraft: TastingPackageShopDraft = {
          clientId: row.id,
          org_id: row.org_id,
          menu_item_ids: menuIds,
        };
        if (row.tier === 'single') singleShops.push(shopDraft);
        else duoShops.push(shopDraft);
      }

      setDraft((d) => ({ ...d, singleShops, duoShops }));
    })();
  }, [existing, isNew]);

  const districtOptions = useMemo(
    () => getDistrictsForAreas(draft.hk_areas).map((d) => ({ value: d, label: d })),
    [draft.hk_areas],
  );

  const mtrOptions = useMemo(
    () => getMtrStationsForDistricts(draft.districts).map((s) => ({ value: s, label: s })),
    [draft.districts],
  );

  const filteredOrgs = useMemo(
    () => filterOrgsForPackage(orgs, draft.districts, draft.mtr_stations),
    [orgs, draft.districts, draft.mtr_stations],
  );

  const orgOptions = useMemo(
    () =>
      filteredOrgs
        .map((o) => ({
          id: o.id,
          org_name: o.org_name,
          label: formatOrgOptionLabel(o),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [filteredOrgs],
  );

  const orgById = useMemo(() => {
    const map = new Map(orgOptions.map((o) => [o.id, o]));
    for (const shop of [...draft.singleShops, ...draft.duoShops]) {
      if (shop.org_id && !map.has(shop.org_id)) {
        const org = orgs.find((o) => o.id === shop.org_id);
        if (org) {
          map.set(org.id, {
            id: org.id,
            org_name: org.org_name,
            label: formatOrgOptionLabel(org),
          });
        }
      }
    }
    return map;
  }, [orgOptions, orgs, draft.singleShops, draft.duoShops]);

  const patchLocation = (patch: Partial<Pick<TastingPackageEditorDraft, 'hk_areas' | 'districts' | 'mtr_stations'>>) => {
    setDraft((d) => {
      const next = {
        hk_areas: patch.hk_areas ?? d.hk_areas,
        districts: patch.districts ?? d.districts,
        mtr_stations: patch.mtr_stations ?? d.mtr_stations,
      };
      const pruned = pruneLocationSelection(next.hk_areas, next.districts, next.mtr_stations);
      return { ...d, ...pruned };
    });
  };

  const addShop = (tier: 'single' | 'duo') => {
    const key = tier === 'single' ? 'singleShops' : 'duoShops';
    const max = tier === 'single' ? TASTING_SINGLE_MAX_SHOPS : TASTING_DUO_MAX_SHOPS;
    setDraft((d) => {
      if (d[key].length >= max) return d;
      return {
        ...d,
        [key]: [...d[key], { clientId: newClientId(), org_id: '', menu_item_ids: [] }],
      };
    });
  };

  const validate = (): string | null => {
    if (!draft.title.trim()) return 'Title is required';
    if (draft.districts.length === 0) return 'Select at least one district';
    if (draft.status === 'published') {
      if (draft.singleShops.length === 0 && draft.duoShops.length === 0) {
        return 'Add at least one shop to Single or Duo tier before publishing';
      }
      for (const shop of [...draft.singleShops, ...draft.duoShops]) {
        if (!shop.org_id) continue;
        const org = orgs.find((o) => o.id === shop.org_id);
        if (org && !orgMatchesPackageLocation(org, draft.districts, draft.mtr_stations)) {
          return `Shop "${org.org_name}" is outside the selected location scope`;
        }
      }
      for (const shop of draft.singleShops) {
        if (!shop.org_id || shop.menu_item_ids.length < TASTING_SINGLE_PORTIONS) {
          return 'Each Single shop needs a shop and 1 menu item';
        }
      }
      for (const shop of draft.duoShops) {
        if (!shop.org_id || shop.menu_item_ids.length < TASTING_DUO_PORTIONS) {
          return 'Each Duo shop needs a shop and 2 menu items';
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast({ title: 'Cannot save', description: err, variant: 'destructive' });
      return;
    }
    try {
      const result = await saveMutation.mutateAsync({
        packageId: isNew ? undefined : id,
        draft,
        createdBy: user?.id,
      });
      toast({ title: 'Saved' });
      if (isNew && result?.id) {
        navigate(`/admin/tasting-packages/${result.id}`, { replace: true });
      }
    } catch (e: unknown) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `tasting-packages/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('treasure-images').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('treasure-images').getPublicUrl(path);
      setDraft((d) => ({ ...d, cover_image_url: urlData.publicUrl }));
    } catch (e: unknown) {
      toast({
        title: 'Upload failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">Super admin only.</p>
      </div>
    );
  }

  const canAddShops = draft.districts.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-4 py-4">
        <button type="button" onClick={() => navigate('/admin/tasting-packages')} className="mr-2 p-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-xl font-bold">{isNew ? 'New package' : 'Edit package'}</h1>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
        </div>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-normal text-foreground">Location</h2>
          <LocationMultiSelect
            label="HK area"
            options={HK_AREA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={draft.hk_areas}
            onChange={(hk_areas) => patchLocation({ hk_areas })}
            placeholder="All areas"
            searchPlaceholder="Search area…"
          />
          <LocationMultiSelect
            label="District"
            options={districtOptions}
            value={draft.districts}
            onChange={(districts) => patchLocation({ districts })}
            placeholder="Select districts"
            searchPlaceholder="Search district…"
          />
          <LocationMultiSelect
            label="MTR station"
            options={mtrOptions}
            value={draft.mtr_stations}
            onChange={(mtr_stations) => patchLocation({ mtr_stations })}
            placeholder="Select stations"
            searchPlaceholder="Search station…"
            disabled={draft.districts.length === 0}
            hint={
              draft.districts.length === 0
                ? 'Select at least one district to choose MTR stations.'
                : undefined
            }
          />
        </section>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Cover image</Label>
          <Input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleCoverUpload(f);
            }}
          />
          {draft.cover_image_url ? (
            <img src={draft.cover_image_url} alt="" className="mt-2 h-32 w-full rounded-xl object-cover" />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={draft.status}
            onValueChange={(v) => setDraft((d) => ({ ...d, status: v as 'draft' | 'published' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Single tier ($77 · up to {TASTING_SINGLE_MAX_SHOPS} shops)</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canAddShops || draft.singleShops.length >= TASTING_SINGLE_MAX_SHOPS}
              onClick={() => addShop('single')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {!canAddShops ? (
            <p className="text-xs text-muted-foreground">Select districts before adding shops.</p>
          ) : null}
          {draft.singleShops.map((shop, idx) => (
            <ShopRowEditor
              key={shop.clientId}
              shop={shop}
              tier="single"
              orgOptions={orgOptions}
              orgById={orgById}
              onChange={(next) =>
                setDraft((d) => {
                  const copy = [...d.singleShops];
                  copy[idx] = next;
                  return { ...d, singleShops: copy };
                })
              }
              onRemove={() =>
                setDraft((d) => ({
                  ...d,
                  singleShops: d.singleShops.filter((_, i) => i !== idx),
                }))
              }
            />
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Duo tier ($177 · up to {TASTING_DUO_MAX_SHOPS} shops)</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canAddShops || draft.duoShops.length >= TASTING_DUO_MAX_SHOPS}
              onClick={() => addShop('duo')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {!canAddShops ? (
            <p className="text-xs text-muted-foreground">Select districts before adding shops.</p>
          ) : null}
          {draft.duoShops.map((shop, idx) => (
            <ShopRowEditor
              key={shop.clientId}
              shop={shop}
              tier="duo"
              orgOptions={orgOptions}
              orgById={orgById}
              onChange={(next) =>
                setDraft((d) => {
                  const copy = [...d.duoShops];
                  copy[idx] = next;
                  return { ...d, duoShops: copy };
                })
              }
              onRemove={() =>
                setDraft((d) => ({
                  ...d,
                  duoShops: d.duoShops.filter((_, i) => i !== idx),
                }))
              }
            />
          ))}
        </section>

        <Button type="button" className="w-full" onClick={() => void handleSave()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save package
        </Button>

        {!isNew && id ? (
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (!window.confirm('Delete this package?')) return;
              void deleteMutation.mutateAsync(id).then(() => navigate('/admin/tasting-packages'));
            }}
          >
            Delete package
          </Button>
        ) : null}
      </div>
    </div>
  );
}
