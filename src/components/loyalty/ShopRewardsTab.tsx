import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCatalogForOrg, useLoyaltyBalance, useRedeemCatalogItem } from "@/hooks/useLoyaltyPoints";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function ShopRewardsTab({ orgId }: { orgId: string }) {
  const { data: balance = 0, isLoading: balLoading } = useLoyaltyBalance(orgId);
  const { data: items = [], isLoading: catLoading } = useCatalogForOrg(orgId);
  const redeem = useRedeemCatalogItem(orgId);
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/20 to-background p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your points</p>
        <p className="mt-1 font-heading text-4xl font-bold tabular-nums text-primary">
          {balLoading ? "…" : balance}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Redeem</p>
        {catLoading ? (
          <p className="text-sm text-muted-foreground">Loading rewards…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rewards in the catalog yet — the shop can add them from Loyalty → Voucher studio.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{it.title}</p>
                  <p className="text-sm text-muted-foreground">{it.points_cost} pts</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  disabled={redeem.isPending || balance < it.points_cost}
                  onClick={async () => {
                    setPendingId(it.id);
                    try {
                      await redeem.mutateAsync(it.id);
                      toast({ title: "Redeemed", description: "Check your Vouchers tab." });
                    } catch (e) {
                      toast({
                        variant: "destructive",
                        title: "Could not redeem",
                        description: e instanceof Error ? e.message : "Try again",
                      });
                    } finally {
                      setPendingId(null);
                    }
                  }}
                >
                  {redeem.isPending && pendingId === it.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Redeem"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
