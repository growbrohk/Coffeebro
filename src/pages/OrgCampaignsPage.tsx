import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrg } from "@/hooks/useOrgs";
import { useOrgCampaigns } from "@/hooks/useOrgCampaigns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildCampaignDisplayTitle } from "@/lib/campaignDisplayTitle";

export default function OrgCampaignsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isStaffUser, isLoading: roleLoading } = useUserRole();
  const { data: org, isLoading: orgLoading } = useOrg(orgId);
  const { data: campaigns = [], isLoading: campLoading } = useOrgCampaigns(orgId);

  const canAccess = Boolean(user && (isSuperAdmin || isStaffUser));

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
        <button type="button" onClick={() => navigate(-1)} className="absolute left-0 p-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-black uppercase tracking-tight">Campaigns</h1>
      </div>

      <div className="container max-w-3xl space-y-4 px-4 py-6">
        <p className="text-sm text-muted-foreground">{org.org_name}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/org/${orgId}/menu`)}>
            Menu
          </Button>
          <Button type="button" className="gap-1" onClick={() => navigate(`/org/${orgId}/campaigns/new`)}>
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        </div>

        {campLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No campaigns yet.</p>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((c) => {
              const title =
                c.display_title?.trim() ||
                buildCampaignDisplayTitle({
                  campaignType: c.campaign_type as "grab" | "hunt",
                  rewardMode: c.reward_mode as "fixed" | "random",
                  vouchers: (c.campaign_vouchers ?? []).map((v) => ({
                    offer_type: v.offer_type,
                    item_name: v.menu_items?.item_name ?? null,
                  })),
                });
              return (
                <li key={c.id}>
                  <Card className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => navigate(`/org/${orgId}/campaigns/${c.id}`)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        {c.campaign_type} · {c.reward_mode} · {c.status}
                      </p>
                      {c.start_at && c.end_at ? (
                        <p className="text-xs">
                          {new Date(c.start_at).toLocaleString()} → {new Date(c.end_at).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-xs">Schedule not set</p>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
