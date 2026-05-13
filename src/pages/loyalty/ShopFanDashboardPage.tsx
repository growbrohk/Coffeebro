import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LineChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ShopInsightsTab } from "@/components/loyalty/ShopInsightsTab";
import { ShopRewardsTab } from "@/components/loyalty/ShopRewardsTab";
import { ShopPointsActivityPanel } from "@/components/loyalty/ShopPointsActivityPanel";
import { useLoyaltyBalance } from "@/hooks/useLoyaltyPoints";

type FanTab = "activity" | "rewards" | "insights";

export default function ShopFanDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { data: balance = 0, isLoading: balLoading } = useLoyaltyBalance(orgId);
  const [tab, setTab] = useState<FanTab>("activity");

  const goBack = () => {
    if (!orgId) return;
    navigate(`/org/${orgId}/menu`);
  };
  const { data: org } = useQuery({
    queryKey: ["org-name", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("orgs")
        .select("org_name")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  if (!orgId) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Missing café.</p>
      </div>
    );
  }

  const name = org?.org_name ?? "Café";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
        <button
          type="button"
          onClick={goBack}
          className="absolute left-0 p-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-xl font-bold tracking-normal">{name}</h1>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-gradient-to-r from-primary/20 to-background p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Your points
            </p>
            <p className="mt-0.5 font-heading text-3xl font-bold tabular-nums text-primary">
              {balLoading ? "…" : balance}
            </p>
          </div>
          <Button
            type="button"
            variant={tab === "insights" ? "default" : "secondary"}
            size="sm"
            className="gap-2 shrink-0"
            aria-pressed={tab === "insights"}
            aria-label="Insights"
            onClick={() => setTab("insights")}
          >
            <LineChart className="h-4 w-4" />
            Insights
          </Button>
        </div>
      </div>

      <div className="px-4 py-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FanTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>
          <TabsContent value="activity" className="mt-4">
            <ShopPointsActivityPanel orgId={orgId} />
          </TabsContent>
          <TabsContent value="rewards" className="mt-4">
            <ShopRewardsTab orgId={orgId} />
          </TabsContent>
          <TabsContent value="insights" className="mt-4">
            <ShopInsightsTab orgId={orgId} orgName={name} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
