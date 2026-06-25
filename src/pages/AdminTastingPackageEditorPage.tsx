import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
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
import { HK_DISTRICTS } from '@/data/hkDistricts';
import { useToast } from '@/hooks/use-toast';
import type { TastingPackageEditorDraft, TastingPackageShopDraft } from '@/types/tastingPackage';
import {
  TASTING_DUO_MAX_SHOPS,
  TASTING_DUO_PORTIONS,
  TASTING_SINGLE_MAX_SHOPS,
  TASTING_SINGLE_PORTIONS,
} from '@/types/tastingPackage';
import { supabase } from '@/integrations/supabase/client';

function newClientId() {
  return crypto.randomUUID();
}

function emptyDraft(): TastingPackageEditorDraft {
  return {
    title: '',
    description: '',
    district: '',
    cover_image_url: '',
    status: 'draft',
    singleShops: [],
    duoShops: [],
  };
}

function ShopRowEditor({
  shop,
  tier,
  orgOptions,
  onChange,
  onRemove,
}: {
  shop: TastingPackageShopDraft;
  tier: 'single' | 'duo';
  orgOptions: { id: string; org_name: string }[];
  onChange: (next: TastingPackageShopDraft) => void;
  onRemove: () => void;
}) {
  const portions = tier === 'single' ? TASTING_SINGLE_PORTIONS : TASTING_DUO_PORTIONS;
  const { data: menuItems = [] } = useOrgMenuItems(shop.org_id || undefined);

  const menuIds = useMemo(() => {
    const ids = [...shop.menu_item_ids];
    while (ids.length < portions) ids.push('');
    return ids.slice(0, portions);
  }, [shop.menu_item_ids, portions]);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Label className="text-xs">Coffee shop</Label>
          <Select
            value={shop.org_id || undefined}
            onValueChange={(orgId) => {
              const org = orgOptions.find((o) => o.id === orgId);
              onChange({
                ...shop,
                org_id: orgId,
                org_name: org?.org_name,
                menu_item_ids: Array(portions).fill(''),
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select shop" />
            </SelectTrigger>
            <SelectContent>
              {orgOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.org_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      district: existing.district,
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

  const orgOptions = useMemo(
    () => orgs.map((o) => ({ id: o.id, org_name: o.org_name })).sort((a, b) => a.org_name.localeCompare(b.org_name)),
    [orgs],
  );

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
    if (!draft.district) return 'District is required';
    if (draft.status === 'published') {
      if (draft.singleShops.length === 0 && draft.duoShops.length === 0) {
        return 'Add at least one shop to Single or Duo tier before publishing';
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

        <div className="space-y-2">
          <Label>District</Label>
          <Select value={draft.district || undefined} onValueChange={(v) => setDraft((d) => ({ ...d, district: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select district" />
            </SelectTrigger>
            <SelectContent>
              {HK_DISTRICTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              disabled={draft.singleShops.length >= TASTING_SINGLE_MAX_SHOPS}
              onClick={() => addShop('single')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {draft.singleShops.map((shop, idx) => (
            <ShopRowEditor
              key={shop.clientId}
              shop={shop}
              tier="single"
              orgOptions={orgOptions}
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
              disabled={draft.duoShops.length >= TASTING_DUO_MAX_SHOPS}
              onClick={() => addShop('duo')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {draft.duoShops.map((shop, idx) => (
            <ShopRowEditor
              key={shop.clientId}
              shop={shop}
              tier="duo"
              orgOptions={orgOptions}
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
