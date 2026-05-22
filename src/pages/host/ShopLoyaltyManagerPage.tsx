import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

function parseReceiptMatchNames(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function formatReceiptMatchNames(names: string[] | null | undefined): string {
  return (names ?? []).join(", ");
}

export default function ShopLoyaltyManagerPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cents, setCents] = useState("100");
  const [receiptNames, setReceiptNames] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["shop-loyalty-settings", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("shop_loyalty_settings")
        .select("cents_per_point, receipt_match_names")
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
    if (settings?.receipt_match_names != null) {
      setReceiptNames(formatReceiptMatchNames(settings.receipt_match_names));
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
        p_receipt_match_names: parseReceiptMatchNames(receiptNames),
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
          onClick={() => navigate(`/org/${orgId}/menu`)}
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

        <div className="space-y-2">
          <Label htmlFor="receipt-names">Receipt names</Label>
          <Textarea
            id="receipt-names"
            className="min-h-[88px] resize-y"
            placeholder="BLUE BOTTLE COFFEE LTD, % ARABICA"
            value={receiptNames}
            onChange={(e) => setReceiptNames(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Names printed on your receipts. Add any that differ from your shop name (e.g. legal entity or
            POS name). No sample receipt upload needed — we match the name on the customer&apos;s receipt
            against these.
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
