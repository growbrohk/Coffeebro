import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronsUpDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useTastingPackage, useTastingPackageRedemptionDates } from '@/hooks/usePublishedTastingPackages';
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
import { Switch } from '@/components/ui/switch';
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
import type { TastingPackageEditorDraft, TastingPackageRedemptionDateDraft, TastingPackageSharedShopDraft } from '@/types/tastingPackage';
import {
  DEFAULT_COFFEE_SHOP_SPLIT_PCT,
  TASTING_DUO_PRICE_CENTS,
  TASTING_PACKAGE_MAX_SHOPS,
  formatTastingPrice,
} from '@/types/tastingPackage';
import { mergeLoadedShopsToDraft } from '@/lib/tastingPackageEditorShops';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getAdminTastingPackageSaveErrorMessage, getErrorMessage } from '@/lib/errorMessage';
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
    is_active: true,
    coffee_shop_split_pct: DEFAULT_COFFEE_SHOP_SPLIT_PCT,
    shops: [],
    redemption_dates: [],
  };
}

function formatRedeemDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return format(d, 'd MMM yyyy');
}

function RedemptionDateRowEditor({
  row,
  bookedCount,
  onChange,
  onRemove,
}: {
  row: TastingPackageRedemptionDateDraft;
  bookedCount?: number;
  onChange: (next: TastingPackageRedemptionDateDraft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-semibold">{formatRedeemDateLabel(row.redeem_date)}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Max purchases</Label>
              <Input
                type="number"
                min={1}
                value={row.max_purchases}
                onChange={(e) =>
                  onChange({ ...row, max_purchases: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </div>
            <div className="flex items-end justify-between gap-2 pb-1">
              <div className="space-y-1">
                <Label className="text-xs">Available</Label>
                <div className="flex h-10 items-center">
                  <Switch
                    checked={row.is_available}
                    onCheckedChange={(checked) => onChange({ ...row, is_available: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
          {bookedCount != null ? (
            <p className="text-xs text-muted-foreground">
              {bookedCount} booked · {Math.max(row.max_purchases - bookedCount, 0)} remaining
            </p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remove date">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

type OrgOption = {
  id: string;
  label: string;
  org_name: string;
};

function SharedShopRowEditor({
  shop,
  orgOptions,
  orgById,
  onChange,
  onRemove,
}: {
  shop: TastingPackageSharedShopDraft;
  orgOptions: OrgOption[];
  orgById: Map<string, OrgOption>;
  onChange: (next: TastingPackageSharedShopDraft) => void;
  onRemove: () => void;
}) {
  const { data: menuItems = [] } = useOrgMenuItems(shop.org_id || undefined);
  const [comboboxOpen, setComboboxOpen] = useState(false);

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
                            single_menu_item_id: '',
                            duo_extra_menu_item_id: '',
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

      <div className="space-y-1">
        <Label className="text-xs">Tasting drink (Single pass)</Label>
        <Select
          value={shop.single_menu_item_id || undefined}
          disabled={!shop.org_id}
          onValueChange={(menuItemId) => onChange({ ...shop, single_menu_item_id: menuItemId })}
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

      <div className="space-y-1">
        <Label className="text-xs">Extra tasting drink (Duo pass)</Label>
        <Select
          value={shop.duo_extra_menu_item_id || undefined}
          disabled={!shop.org_id}
          onValueChange={(menuItemId) => onChange({ ...shop, duo_extra_menu_item_id: menuItemId })}
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
  const { data: redemptionStats = [] } = useTastingPackageRedemptionDates(isNew ? undefined : id);
  const { data: orgs = [] } = useOrgs();
  const saveMutation = useTastingPackageMutations();
  const deleteMutation = useDeleteTastingPackage();

  const [draft, setDraft] = useState<TastingPackageEditorDraft>(emptyDraft);
  const [uploading, setUploading] = useState(false);
  const [shopsLoaded, setShopsLoaded] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      setShopsLoaded(true);
      return;
    }
    if (!existing) {
      setShopsLoaded(false);
      return;
    }

    setShopsLoaded(false);
    setDraft({
      title: existing.title,
      description: existing.description ?? '',
      hk_areas: existing.hk_areas ?? [],
      districts: existing.districts ?? [],
      mtr_stations: existing.mtr_stations ?? [],
      cover_image_url: existing.cover_image_url ?? '',
      status: existing.status as 'draft' | 'published',
      is_active: existing.is_active ?? true,
      coffee_shop_split_pct: existing.coffee_shop_split_pct ?? DEFAULT_COFFEE_SHOP_SPLIT_PCT,
      shops: [],
      redemption_dates: [],
    });

    void (async () => {
      try {
        const [shopsRes, datesRes] = await Promise.all([
          supabase
            .from('tasting_package_shops')
            .select('id, tier, org_id, sort_order, tasting_package_items ( menu_item_id, portion_index )')
            .eq('package_id', existing.id)
            .order('sort_order'),
          supabase
            .from('tasting_package_redemption_dates')
            .select('redeem_date, is_available, max_purchases')
            .eq('package_id', existing.id)
            .order('redeem_date'),
        ]);
        if (shopsRes.error) throw shopsRes.error;
        if (datesRes.error) throw datesRes.error;

        const data = shopsRes.data;
        if (!data) return;

        const singleRows: { id: string; org_id: string; menu_item_ids: string[] }[] = [];
        const duoRows: { id: string; org_id: string; menu_item_ids: string[] }[] = [];

        for (const row of data) {
          const rawItems = row.tasting_package_items;
          const items = (Array.isArray(rawItems) ? rawItems : []) as {
            menu_item_id: string;
            portion_index: number;
          }[];
          const menuIds = items
            .sort((a, b) => a.portion_index - b.portion_index)
            .map((it) => it.menu_item_id);
          const loaded = { id: row.id, org_id: row.org_id, menu_item_ids: menuIds };
          if (row.tier === 'single') singleRows.push(loaded);
          else duoRows.push(loaded);
        }

        setDraft((d) => ({
          ...d,
          shops: mergeLoadedShopsToDraft(singleRows, duoRows),
          redemption_dates: (datesRes.data ?? []).map((row) => ({
            clientId: newClientId(),
            redeem_date: row.redeem_date,
            is_available: row.is_available,
            max_purchases: row.max_purchases,
          })),
        }));
      } finally {
        setShopsLoaded(true);
      }
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
    for (const shop of draft.shops) {
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
  }, [orgOptions, orgs, draft.shops]);

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

  const addShop = () => {
    setDraft((d) => {
      if (d.shops.length >= TASTING_PACKAGE_MAX_SHOPS) return d;
      return {
        ...d,
        shops: [
          ...d.shops,
          {
            clientId: newClientId(),
            org_id: '',
            single_menu_item_id: '',
            duo_extra_menu_item_id: '',
          },
        ],
      };
    });
  };

  const bookedByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of redemptionStats) {
      map.set(row.redeem_date, row.booked_count);
    }
    return map;
  }, [redemptionStats]);

  const existingRedeemDates = useMemo(
    () => new Set(draft.redemption_dates.map((d) => d.redeem_date)),
    [draft.redemption_dates],
  );

  const addRedemptionDate = (date: Date | undefined) => {
    if (!date) return;
    const redeem_date = format(date, 'yyyy-MM-dd');
    if (existingRedeemDates.has(redeem_date)) return;
    setDraft((d) => ({
      ...d,
      redemption_dates: [
        ...d.redemption_dates,
        {
          clientId: newClientId(),
          redeem_date,
          is_available: true,
          max_purchases: 20,
        },
      ].sort((a, b) => a.redeem_date.localeCompare(b.redeem_date)),
    }));
  };

  const validate = (): string | null => {
    if (!draft.title.trim()) return 'Title is required';
    if (draft.districts.length === 0) return 'Select at least one district';
    if (draft.shops.length > TASTING_PACKAGE_MAX_SHOPS) {
      return `Maximum ${TASTING_PACKAGE_MAX_SHOPS} shops per package`;
    }
    const orgIds = draft.shops.map((s) => s.org_id.trim()).filter(Boolean);
    if (new Set(orgIds).size !== orgIds.length) {
      return 'Each coffee shop can only appear once';
    }
    if (draft.status === 'published') {
      if (draft.shops.length === 0) {
        return 'Add at least one shop before publishing';
      }
      for (const shop of draft.shops) {
        if (!shop.org_id) continue;
        const org = orgs.find((o) => o.id === shop.org_id);
        if (org && !orgMatchesPackageLocation(org, draft.districts, draft.mtr_stations)) {
          return `Shop "${org.org_name}" is outside the selected location scope`;
        }
      }
      for (const shop of draft.shops) {
        if (!shop.org_id || !shop.single_menu_item_id || !shop.duo_extra_menu_item_id) {
          return 'Each shop needs a shop, Single pass drink, and Duo extra drink';
        }
      }
      const todayHkt = format(new Date(), 'yyyy-MM-dd');
      const hasFutureDate = draft.redemption_dates.some(
        (d) => d.is_available && d.redeem_date >= todayHkt && d.max_purchases >= 1,
      );
      if (!hasFutureDate) {
        return 'Add at least one available future redemption date before publishing';
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
        description: getAdminTastingPackageSaveErrorMessage(e),
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
        description: getErrorMessage(e),
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

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold">Redemption dates</h2>
            <p className="text-xs text-muted-foreground">
              Customers pick one day at checkout. All shop vouchers in a purchase must be redeemed on that day
              during each shop&apos;s opening hours.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <Calendar
              mode="single"
              disabled={(date) => {
                const key = format(date, 'yyyy-MM-dd');
                return existingRedeemDates.has(key) || date < new Date(new Date().setHours(0, 0, 0, 0));
              }}
              onSelect={addRedemptionDate}
            />
          </div>
          {draft.redemption_dates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No dates yet. Pick a day on the calendar to add one.</p>
          ) : (
            <div className="space-y-2">
              {draft.redemption_dates.map((row, idx) => (
                <RedemptionDateRowEditor
                  key={row.clientId}
                  row={row}
                  bookedCount={bookedByDate.get(row.redeem_date)}
                  onChange={(next) =>
                    setDraft((d) => {
                      const copy = [...d.redemption_dates];
                      copy[idx] = next;
                      return { ...d, redemption_dates: copy };
                    })
                  }
                  onRemove={() =>
                    setDraft((d) => ({
                      ...d,
                      redemption_dates: d.redemption_dates.filter((_, i) => i !== idx),
                    }))
                  }
                />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={draft.status}
            onValueChange={(v) =>
              setDraft((d) => ({
                ...d,
                status: v as 'draft' | 'published',
                is_active: v === 'published' ? d.is_active : false,
              }))
            }
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

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4">
          <div className="space-y-1">
            <Label htmlFor="is-active">Show in app</Label>
            <p className="text-xs text-muted-foreground">
              {draft.status === 'draft'
                ? 'Publish the package before it can appear in Explore and the map.'
                : 'Turn off to hide from users without reverting to draft.'}
            </p>
          </div>
          <Switch
            id="is-active"
            checked={draft.is_active}
            disabled={draft.status === 'draft'}
            onCheckedChange={(checked) => setDraft((d) => ({ ...d, is_active: checked }))}
          />
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              Package shops ($77 Single / {formatTastingPrice(TASTING_DUO_PRICE_CENTS)} Duo · up to{' '}
              {TASTING_PACKAGE_MAX_SHOPS} shops)
            </h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canAddShops || draft.shops.length >= TASTING_PACKAGE_MAX_SHOPS}
              onClick={addShop}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <Label className="text-xs">Coffee shop split (%)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              step={1}
              value={Math.round(draft.coffee_shop_split_pct * 100)}
              onChange={(e) => {
                const pct = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                setDraft((d) => ({ ...d, coffee_shop_split_pct: pct / 100 }));
              }}
            />
            <p className="text-xs text-muted-foreground">
              Coffeebro keeps {100 - Math.round(draft.coffee_shop_split_pct * 100)}% of each sale.
              {draft.shops.length > 0 ? (
                <>
                  {' '}
                  Each shop earns ~
                  {formatTastingPrice(
                    Math.round(
                      (7700 * draft.coffee_shop_split_pct) / draft.shops.length,
                    ),
                  )}{' '}
                  (Single) or ~
                  {formatTastingPrice(
                    Math.round(
                      (TASTING_DUO_PRICE_CENTS * draft.coffee_shop_split_pct) / draft.shops.length,
                    ),
                  )}{' '}
                  (Duo) per redemption.
                </>
              ) : null}
            </p>
          </div>
          {!canAddShops ? (
            <p className="text-xs text-muted-foreground">Select districts before adding shops.</p>
          ) : null}
          {draft.shops.map((shop, idx) => (
            <SharedShopRowEditor
              key={shop.clientId}
              shop={shop}
              orgOptions={orgOptions}
              orgById={orgById}
              onChange={(next) =>
                setDraft((d) => {
                  const copy = [...d.shops];
                  copy[idx] = next;
                  return { ...d, shops: copy };
                })
              }
              onRemove={() =>
                setDraft((d) => ({
                  ...d,
                  shops: d.shops.filter((_, i) => i !== idx),
                }))
              }
            />
          ))}
        </section>

        <Button
          type="button"
          className="w-full"
          onClick={() => void handleSave()}
          disabled={saveMutation.isPending || (!isNew && !shopsLoaded)}
        >
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {!isNew && !shopsLoaded ? 'Loading shops…' : 'Save package'}
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
