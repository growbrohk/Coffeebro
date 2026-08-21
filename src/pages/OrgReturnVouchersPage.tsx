import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrg } from "@/hooks/useOrgs";
import { useOrgMenuItems } from "@/hooks/useOrgMenuItems";
import {
  useReturnVoucherPresetMutations,
  useReturnVoucherPresets,
  type ReturnVoucherPresetWithMenu,
} from "@/hooks/useReturnVoucherPresets";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ReturnVoucherPresetCard,
  newReturnVoucherPresetDraft,
  type ReturnVoucherPresetDraft,
} from "@/components/returnVouchers/ReturnVoucherPresetCard";
import { useToast } from "@/hooks/use-toast";
import { validateVoucherOfferLine } from "@/lib/campaignFormSchema";
import { menuItemIdFromDb, menuItemIdToDb } from "@/lib/voucherOfferType";

function presetToDraft(row: ReturnVoucherPresetWithMenu, index: number): ReturnVoucherPresetDraft {
  return {
    clientKey: row.id,
    id: row.id,
    title: row.title,
    menu_item_id: menuItemIdFromDb(row.menu_item_id),
    offer_type: row.offer_type,
    redeem_valid_days: row.redeem_valid_days,
    quantity: row.quantity,
    temperature_rule: row.temperature_rule,
    fulfillment_rule: row.fulfillment_rule,
    sort_order: row.sort_order ?? index,
  };
}

function validateDraft(
  draft: ReturnVoucherPresetDraft,
  getMenuItem: (id: string) => { base_price: number } | undefined,
): string | null {
  if (!draft.title.trim()) return "Title is required";
  const menuItemId = menuItemIdToDb(draft.menu_item_id);
  const offerErr = validateVoucherOfferLine(draft.offer_type, menuItemId, getMenuItem);
  if (offerErr) return offerErr;
  if (!Number.isFinite(draft.quantity) || draft.quantity < 1) return "Pool quantity must be at least 1";
  if (!Number.isFinite(draft.redeem_valid_days) || draft.redeem_valid_days < 1 || draft.redeem_valid_days > 90) {
    return "Valid days must be between 1 and 90";
  }
  return null;
}

export default function OrgReturnVouchersPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isStaffUser, isLoading: roleLoading } = useUserRole();
  const { data: org, isLoading: orgLoading } = useOrg(orgId);
  const { data: menuItems = [] } = useOrgMenuItems(orgId);
  const { data: presets = [], isLoading: presetsLoading } = useReturnVoucherPresets(orgId);
  const { upsert, remove } = useReturnVoucherPresetMutations(orgId);
  const { toast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<ReturnVoucherPresetDraft>(newReturnVoucherPresetDraft(0));

  const canAccess = Boolean(user && (isSuperAdmin || isStaffUser));

  const openCreate = () => {
    setDraft(newReturnVoucherPresetDraft(presets.length));
    setSheetOpen(true);
  };

  const openEdit = (row: ReturnVoucherPresetWithMenu, index: number) => {
    setDraft(presetToDraft(row, index));
    setSheetOpen(true);
  };

  const handleSave = async () => {
    const err = validateDraft(draft, (id) => menuItems.find((m) => m.id === id));
    if (err) {
      toast({ title: "Cannot save", description: err, variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: draft.id,
        title: draft.title.trim(),
        menu_item_id: menuItemIdToDb(draft.menu_item_id),
        offer_type: draft.offer_type,
        redeem_valid_days: draft.redeem_valid_days,
        quantity: draft.quantity,
        temperature_rule: draft.temperature_rule,
        fulfillment_rule: draft.fulfillment_rule,
        sort_order: draft.sort_order,
      });
      toast({ title: "Saved" });
      setSheetOpen(false);
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!draft.id) return;
    try {
      await remove.mutateAsync(draft.id);
      toast({ title: "Deleted" });
      setSheetOpen(false);
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (authLoading || roleLoading || orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading…</div>
      </div>
    );
  }

  if (!user || !canAccess) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">You don&apos;t have access to this page.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate("/settings")}>
          Back
        </Button>
      </div>
    );
  }

  if (!orgId || !org) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Organization not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="absolute left-0 p-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-2xl font-bold tracking-normal">Vouchers</h1>
      </div>

      <div className="container max-w-3xl space-y-4 px-4 py-6">
        <p className="text-sm text-muted-foreground">{org.org_name}</p>
        <p className="text-sm text-muted-foreground">
          Return voucher presets are minted to customers when staff redeems a linked campaign or tasting voucher.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/org/${orgId}/menu`)}>
            Menu
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/org/${orgId}/campaigns`)}>
            Campaigns
          </Button>
          <Button type="button" className="gap-1" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add preset
          </Button>
        </div>

        {presetsLoading ? (
          <p className="text-sm text-muted-foreground">Loading presets…</p>
        ) : presets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No return voucher presets yet.</p>
        ) : (
          <div className="space-y-3">
            {presets.map((preset, index) => (
              <button
                key={preset.id}
                type="button"
                className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30"
                onClick={() => openEdit(preset, index)}
              >
                <p className="font-semibold">{preset.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {preset.menu_items?.item_name ?? "Menu item"} · pool {preset.quantity} · {preset.redeem_valid_days} days
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{draft.id ? "Edit preset" : "New preset"}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 py-4">
            <ReturnVoucherPresetCard
              index={draft.sort_order}
              value={draft}
              menuItems={menuItems}
              onChange={setDraft}
              onRemove={() => setSheetOpen(false)}
              canRemove={false}
              disabled={upsert.isPending}
            />
          </div>
          <SheetFooter className="flex flex-col gap-2 sm:flex-col">
            <Button onClick={() => void handleSave()} disabled={upsert.isPending}>
              Save
            </Button>
            {draft.id ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDelete()}
                disabled={remove.isPending}
              >
                Delete
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
