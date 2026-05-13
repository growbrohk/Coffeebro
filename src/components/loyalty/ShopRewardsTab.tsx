import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useCatalogForOrg,
  useLoyaltyCatalogAvailability,
  useMyCatalogRedemptionCounts,
  useLoyaltyBalance,
  useRedeemCatalogItem,
} from "@/hooks/useLoyaltyPoints";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { formatRedeemCatalogError } from "@/lib/loyaltyErrors";

export function ShopRewardsTab({ orgId }: { orgId: string }) {
  const { data: balance = 0, isLoading: balLoading } = useLoyaltyBalance(orgId);
  const { data: items = [], isLoading: catLoading } = useCatalogForOrg(orgId);
  const { data: mintedMap = {} } = useLoyaltyCatalogAvailability(orgId);
  const { data: myCounts = {} } = useMyCatalogRedemptionCounts(orgId);
  const redeem = useRedeemCatalogItem(orgId);
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
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
            {items.map((it) => {
              const minted = mintedMap[it.id] ?? 0;
              const mine = myCounts[it.id] ?? 0;
              const globalFull =
                it.quantity_cap != null && minted >= it.quantity_cap;
              const userFull =
                it.max_redemptions_per_user != null &&
                mine >= it.max_redemptions_per_user;
              const capped = globalFull || userFull;
              const capParts: string[] = [];
              if (it.quantity_cap != null) {
                capParts.push(`${minted} / ${it.quantity_cap} total`);
              }
              if (it.max_redemptions_per_user != null) {
                capParts.push(`${mine} / ${it.max_redemptions_per_user} for you`);
              }

              return (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{it.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {it.points_cost} pts
                      {balLoading ? "" : balance < it.points_cost ? " · not enough points" : ""}
                    </p>
                    {capParts.length > 0 ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{capParts.join(" · ")}</p>
                    ) : null}
                    {globalFull ? (
                      <p className="mt-0.5 text-xs font-medium text-destructive">Sold out</p>
                    ) : null}
                    {userFull && !globalFull ? (
                      <p className="mt-0.5 text-xs font-medium text-destructive">
                        Limit reached for you
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    disabled={
                      redeem.isPending ||
                      balLoading ||
                      balance < it.points_cost ||
                      capped
                    }
                    onClick={async () => {
                      setPendingId(it.id);
                      try {
                        await redeem.mutateAsync(it.id);
                        toast({ title: "Redeemed", description: "Check your Vouchers tab." });
                      } catch (e) {
                        toast({
                          variant: "destructive",
                          title: "Could not redeem",
                          description: formatRedeemCatalogError(e),
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
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
