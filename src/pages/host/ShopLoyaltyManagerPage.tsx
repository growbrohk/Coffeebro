import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ShopLoyaltyManagerPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cents, setCents] = useState("100");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["shop-loyalty-settings", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("shop_loyalty_settings")
        .select("cents_per_point")
        .eq("org_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    if (settings?.cents_per_point != null) {
      setCents(String(settings.cents_per_point));
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Missing org");
      const n = parseInt(cents, 10);
      if (!Number.isFinite(n) || n < 1) throw new Error("Enter a positive number");
      const { error } = await supabase.rpc("upsert_shop_loyalty_settings", {
        p_org_id: orgId,
        p_cents_per_point: n,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["shop-loyalty-settings", orgId] });
      toast({ title: "Saved", description: "Point conversion updated." });
    },
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Save failed", description: e.message });
    },
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
          onClick={() => navigate(-1)}
          className="absolute left-0 p-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-xl font-bold tracking-normal">Loyalty</h1>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Auto redemption (v1):</strong> Points are added
          when a customer scans a receipt. 1 point = every{" "}
          <span className="whitespace-nowrap">HKD (minor units) ÷ rate</span>.
        </p>

        <div className="space-y-2">
          <Label htmlFor="cents">Cents per 1 loyalty point</Label>
          <Input
            id="cents"
            type="number"
            min={1}
            className="h-11"
            value={cents}
            onChange={(e) => setCents(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Example: <strong>100</strong> means $1.00 HKD spend → 1 point.
          </p>
        </div>

        <Button type="button" className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/host/org/${orgId}/loyalty/vouchers`)}
        >
          Voucher studio
        </Button>
      </div>
    </div>
  );
}
