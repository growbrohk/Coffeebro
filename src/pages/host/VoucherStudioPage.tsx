import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useOrgMenuItems } from "@/hooks/useOrgMenuItems";

type CatalogRow = {
  id: string;
  title: string;
  points_cost: number;
  active: boolean;
  menu_item_id: string | null;
  quantity_cap: number | null;
  max_redemptions_per_user: number | null;
  sort_order: number;
};

export default function VoucherStudioPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [title, setTitle] = useState("");
  const [pointsCost, setPointsCost] = useState("50");
  const [quantityCap, setQuantityCap] = useState("");
  const [maxPerCustomer, setMaxPerCustomer] = useState("");
  const [menuItemId, setMenuItemId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["vouchers-catalog-all", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("vouchers_catalog")
        .select("*")
        .eq("org_id", orgId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as CatalogRow[];
    },
    enabled: !!orgId,
  });

  const { data: menuItems = [] } = useOrgMenuItems(orgId);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setPointsCost("50");
    setQuantityCap("");
    setMaxPerCustomer("");
    setMenuItemId(null);
    setSheetOpen(true);
  };

  const openEdit = (row: CatalogRow) => {
    setEditing(row);
    setTitle(row.title);
    setPointsCost(String(row.points_cost));
    setQuantityCap(row.quantity_cap != null ? String(row.quantity_cap) : "");
    setMaxPerCustomer(
      row.max_redemptions_per_user != null ? String(row.max_redemptions_per_user) : "",
    );
    setMenuItemId(row.menu_item_id);
    setSheetOpen(true);
  };

  const upsert = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Missing org");
      const pc = parseInt(pointsCost, 10);
      if (!title.trim()) throw new Error("Title required");
      if (!Number.isFinite(pc) || pc < 1) throw new Error("Invalid points cost");
      const cap =
        quantityCap.trim() === "" ? null : parseInt(quantityCap, 10);
      if (cap != null && (!Number.isFinite(cap) || cap < 1)) throw new Error("Invalid total cap");
      const perUser =
        maxPerCustomer.trim() === "" ? null : parseInt(maxPerCustomer, 10);
      if (perUser != null && (!Number.isFinite(perUser) || perUser < 1))
        throw new Error("Invalid max per customer");

      if (editing) {
        const { error } = await supabase
          .from("vouchers_catalog")
          .update({
            title: title.trim(),
            points_cost: pc,
            quantity_cap: cap,
            max_redemptions_per_user: perUser,
            menu_item_id: menuItemId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vouchers_catalog").insert({
          org_id: orgId,
          title: title.trim(),
          points_cost: pc,
          quantity_cap: cap,
          max_redemptions_per_user: perUser,
          menu_item_id: menuItemId,
          active: true,
          sort_order: rows.length,
        });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vouchers-catalog-all", orgId] });
      await qc.invalidateQueries({ queryKey: ["vouchers-catalog", orgId] });
      setSheetOpen(false);
      toast({ title: "Saved" });
    },
    onError: (e: Error) =>
      toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("vouchers_catalog")
        .update({ active: !active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vouchers-catalog-all", orgId] }),
  });

  if (!orgId) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Missing organization.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(`/host/org/${orgId}/loyalty`)}
          className="absolute left-0 p-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-xl font-bold tracking-normal">Voucher studio</h1>
      </div>

      <div className="container max-w-lg space-y-4 px-4 py-6">
        <Button type="button" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add reward
        </Button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.points_cost} pts
                    {!r.active ? " · hidden" : ""}
                    {r.quantity_cap != null ? ` · total cap ${r.quantity_cap}` : ""}
                    {r.max_redemptions_per_user != null
                      ? ` · max ${r.max_redemptions_per_user}/customer`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive.mutate({ id: r.id, active: r.active })}
                  >
                    {r.active ? "Hide" : "Show"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit reward" : "New reward"}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Points cost</Label>
              <Input
                type="number"
                min={1}
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Total redemptions cap (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Max vouchers for this reward across <strong>all customers</strong>. Leave blank for unlimited.
              </p>
              <Input
                placeholder="Unlimited"
                value={quantityCap}
                onChange={(e) => setQuantityCap(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Max per customer (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Max times each customer can redeem this reward (lifetime).
              </p>
              <Input
                placeholder="Unlimited"
                value={maxPerCustomer}
                onChange={(e) => setMaxPerCustomer(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Menu item (optional)</Label>
              <select
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={menuItemId ?? ""}
                onChange={(e) => setMenuItemId(e.target.value || null)}
              >
                <option value="">None</option>
                {menuItems
                  .filter((m) => m.status === "active")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.item_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <SheetFooter>
            <Button className="w-full" onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
