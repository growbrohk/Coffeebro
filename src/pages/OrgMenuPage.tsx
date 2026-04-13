import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrg } from "@/hooks/useOrgs";
import { useOrgMenuItems, useMenuItemMutations, type MenuItemRow } from "@/hooks/useOrgMenuItems";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { MenuItemTable } from "@/components/menu/MenuItemTable";
import { MenuItemFormFields, emptyMenuItemForm, type MenuItemFormValues } from "@/components/menu/MenuItemFormFields";
import { useToast } from "@/hooks/use-toast";

export default function OrgMenuPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isStaffUser, isLoading: roleLoading } = useUserRole();
  const { data: org, isLoading: orgLoading } = useOrg(orgId);
  const { data: items = [], isLoading: itemsLoading } = useOrgMenuItems(orgId);
  const { insert, update, remove } = useMenuItemMutations(orgId);
  const { toast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItemRow | null>(null);
  const [form, setForm] = useState<MenuItemFormValues>(emptyMenuItemForm(orgId ?? ""));

  const canAccess = Boolean(user && (isSuperAdmin || isStaffUser));

  const openCreate = () => {
    if (!orgId) return;
    setEditing(null);
    setForm(emptyMenuItemForm(orgId));
    setSheetOpen(true);
  };

  const openEdit = (row: MenuItemRow) => {
    setEditing(row);
    setForm({
      item_name: row.item_name,
      category: row.category as MenuItemFormValues["category"],
      base_price: Number(row.base_price),
      temperature_option: row.temperature_option as MenuItemFormValues["temperature_option"],
      fulfillment_option: row.fulfillment_option as MenuItemFormValues["fulfillment_option"],
      status: row.status as MenuItemFormValues["status"],
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!orgId) return;
    if (!form.item_name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: { ...form, org_id: orgId } });
        toast({ title: "Saved" });
      } else {
        await insert.mutateAsync({ ...form, org_id: orgId });
        toast({ title: "Created" });
      }
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
    if (!editing) return;
    try {
      await remove.mutateAsync(editing.id);
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
        <h1 className="text-lg font-black uppercase tracking-tight">Menu</h1>
      </div>

      <div className="container max-w-3xl space-y-4 px-4 py-6">
        <p className="text-sm text-muted-foreground">{org.org_name}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={openCreate} className="gap-1">
            <Plus className="h-4 w-4" />
            Add item
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/org/${orgId}/campaigns`)}>
            Campaigns
          </Button>
        </div>
        {itemsLoading ? (
          <p className="text-sm text-muted-foreground">Loading menu…</p>
        ) : (
          <MenuItemTable items={items} onEdit={openEdit} />
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit menu item" : "New menu item"}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 py-4">
            <MenuItemFormFields value={form} onChange={setForm} disabled={insert.isPending || update.isPending} />
          </div>
          <SheetFooter className="flex flex-col gap-2 sm:flex-col">
            <Button onClick={handleSave} disabled={insert.isPending || update.isPending}>
              Save
            </Button>
            {editing ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
                Delete
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
