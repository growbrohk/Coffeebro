import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useClaimCampaign, describeClaimCampaignError } from "@/hooks/useClaimCampaign";
import { useToast } from "@/hooks/use-toast";
import type { PublishedCampaignRow } from "@/lib/campaignToMapItem";

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const claim = useClaimCampaign();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign_public", campaignId],
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<PublishedCampaignRow | null> => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          `
          *,
          orgs ( id, org_name, logo_url, preview_photo_url, lat, lng, location ),
          campaign_vouchers ( *, menu_items (*) )
        `,
        )
        .eq("id", campaignId)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data as PublishedCampaignRow | null;
    },
  });

  const onGrab = async () => {
    if (!user || !campaignId) {
      navigate("/profile");
      return;
    }
    if (campaign?.campaign_type !== "grab") return;
    try {
      await claim.mutateAsync(campaignId);
      toast({ title: "Claimed!", description: "Check your wallet." });
    } catch (e) {
      toast({
        title: "Could not claim",
        description: describeClaimCampaignError(e),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading…</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Campaign not found or not published.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate("/hunts")}>
          Back to map
        </Button>
      </div>
    );
  }

  const org = campaign.orgs;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-4 py-4">
        <button type="button" onClick={() => navigate(-1)} className="mr-2 p-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold leading-tight">{campaign.display_title ?? "Campaign"}</h1>
      </div>

      <div className="container max-w-lg space-y-4 px-4 py-6">
        {org?.org_name ? <p className="text-sm text-muted-foreground">{org.org_name}</p> : null}

        <p className="text-sm capitalize text-muted-foreground">
          {campaign.campaign_type} · {campaign.reward_mode}
        </p>

        {campaign.hint_text ? <p className="text-sm">{campaign.hint_text}</p> : null}

        {campaign.hint_image_url ? (
          <img src={campaign.hint_image_url} alt="" className="w-full max-h-64 rounded-lg object-cover" />
        ) : null}

        {campaign.campaign_type === "grab" ? (
          <Button className="w-full" onClick={() => void onGrab()} disabled={claim.isPending}>
            {claim.isPending ? "Claiming…" : "Grab offer"}
          </Button>
        ) : (
          <Button className="w-full" variant="secondary" onClick={() => navigate("/hunts/scan")}>
            Scan hunt QR
          </Button>
        )}
      </div>
    </div>
  );
}
