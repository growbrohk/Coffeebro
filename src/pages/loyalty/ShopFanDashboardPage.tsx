import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopInsightsTab } from "@/components/loyalty/ShopInsightsTab";
import { ShopRewardsTab } from "@/components/loyalty/ShopRewardsTab";

export default function ShopFanDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

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
          onClick={() => navigate(-1)}
          className="absolute left-0 p-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-xl font-bold tracking-normal">{name}</h1>
      </div>

      <div className="px-4 py-4">
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>
          <TabsContent value="insights" className="mt-4">
            <ShopInsightsTab orgId={orgId} orgName={name} />
          </TabsContent>
          <TabsContent value="rewards" className="mt-4">
            <ShopRewardsTab orgId={orgId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
