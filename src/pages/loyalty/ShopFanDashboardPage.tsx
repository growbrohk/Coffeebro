import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, History } from "lucide-react";

export default function ShopFanDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { data: balance = 0, isLoading: balLoading } = useLoyaltyBalance(orgId);

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
            variant="secondary"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => navigate(`/loyalty/orgs/${orgId}/activity`)}
          >
            <History className="h-4 w-4" />
            Activity
          </Button>
        </div>
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
