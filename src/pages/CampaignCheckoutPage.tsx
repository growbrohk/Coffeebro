import { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClaimCampaign, describeClaimCampaignError } from "@/hooks/useClaimCampaign";
import { useClaimHuntCampaign } from "@/hooks/useClaimHuntCampaign";
import type { PublishedCampaignRow } from "@/lib/campaignToMapItem";
import { createCampaignCheckoutRequest } from "@/lib/createCampaignCheckout";
import {
  displayAmountCentsForVoucherLine,
  fixedCampaignRequiresPayment,
  formatHkdFromCents,
} from "@/lib/campaignClaimPricing";
import { voucherNameFromOfferAndMenu } from "@/lib/voucherOfferLabels";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

export type CampaignCheckoutLocationState = {
  channel: "grab" | "hunt";
  huntQrPayload?: string;
};

type CampaignVoucherRow = Tables<"campaign_vouchers"> & {
  menu_items: Tables<"menu_items"> | null;
};

function sortVouchers(list: PublishedCampaignRow["campaign_vouchers"]): CampaignVoucherRow[] {
  const arr = Array.isArray(list) ? list : list ? [list] : [];
  return [...arr].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
}

export default function CampaignCheckoutPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const claim = useClaimCampaign();
  const claimHunt = useClaimHuntCampaign();

  const state = location.state as CampaignCheckoutLocationState | null;
  const channel = state?.channel;
  const huntQrPayload = state?.huntQrPayload;

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user && campaignId) {
      navigate("/profile", { replace: true });
    }
  }, [user, navigate, campaignId]);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign_public", campaignId, "checkout"],
    enabled: Boolean(campaignId) && Boolean(user),
    queryFn: async (): Promise<PublishedCampaignRow | null> => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          `
          *,
          orgs ( id, org_name ),
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

  const sorted = useMemo(() => (campaign ? sortVouchers(campaign.campaign_vouchers) : []), [campaign]);
  const primary = sorted[0];
  const title = campaign?.display_title?.trim() || "Campaign";
  const displayCents = useMemo(() => {
    if (!primary) return null;
    const base = primary.menu_items?.base_price != null ? Number(primary.menu_items.base_price) : null;
    return displayAmountCentsForVoucherLine(primary.offer_type, base);
  }, [primary]);
  const lineName = voucherNameFromOfferAndMenu(primary?.offer_type, primary?.menu_items?.item_name);
  const needsPay = campaign
    ? fixedCampaignRequiresPayment(campaign.reward_mode, primary?.offer_type)
    : false;

  const cancelHref =
    channel === "hunt" ? "/hunts/scan" : campaignId ? `/campaigns/${campaignId}` : "/hunts";

  const startCheckout = useCallback(async () => {
    if (!user || !campaignId || !channel) return;
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast({ title: "Sign in required", variant: "destructive" });
        navigate("/profile");
        return;
      }
      const res = await createCampaignCheckoutRequest(token, {
        campaignId,
        channel,
        huntQrPayload: channel === "hunt" ? huntQrPayload : undefined,
      });
      if (!res.requiresPayment) {
        if (channel === "grab") {
          await claim.mutateAsync(campaignId);
          void queryClient.invalidateQueries({ queryKey: ["vouchers", "my"] });
          toast({ title: "Claimed!", description: "Check your wallet." });
          navigate(`/campaigns/${campaignId}`, { replace: true });
          return;
        }
        const p = huntQrPayload?.trim();
        if (!p) {
          toast({ title: "Missing code", description: "Scan the hunt QR again.", variant: "destructive" });
          return;
        }
        await claimHunt.mutateAsync(p);
        toast({ title: "Claimed!", description: "Check your wallet." });
        navigate("/hunts/scan", { replace: true });
        return;
      }
      window.location.assign(res.checkoutUrl);
    } catch (e: unknown) {
      toast({
        title: "Checkout unavailable",
        description: describeClaimCampaignError(e),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [user, campaignId, channel, huntQrPayload, claim, claimHunt, navigate, queryClient, toast]);

  if (!campaignId) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">Invalid link.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/hunts")}>
          Back
        </Button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground mb-4">
          Open checkout from the campaign or scan screen (this page was opened directly).
        </p>
        <Button asChild variant="outline">
          <Link to={campaignId ? `/campaigns/${campaignId}` : "/hunts"}>Back to campaign</Link>
        </Button>
      </div>
    );
  }

  if (channel === "hunt" && !huntQrPayload?.trim()) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground mb-4">Missing hunt QR context. Scan the code again.</p>
        <Button asChild variant="outline">
          <Link to="/hunts/scan">Scan hunt</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">Campaign not found.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/hunts")}>
          Back
        </Button>
      </div>
    );
  }

  if (!needsPay) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-4 py-4">
          <button type="button" onClick={() => navigate(-1)} className="mr-2 p-2" aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">{title}</h1>
        </div>
        <div className="container max-w-lg space-y-4 px-4 py-6">
          <p className="text-sm text-muted-foreground">This offer is free — no payment needed.</p>
          <Button
            className="w-full"
            onClick={() => void startCheckout()}
            disabled={submitting || claim.isPending || claimHunt.isPending}
          >
            {(submitting || claim.isPending || claimHunt.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Claim to wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-4 py-4">
        <button type="button" onClick={() => navigate(-1)} className="mr-2 p-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold">Checkout</h1>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Campaign</p>
          <p className="text-base font-semibold">{title}</p>
        </div>
        {lineName ? (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Reward</p>
            <p className="text-base">{lineName}</p>
          </div>
        ) : null}
        <div>
          <p className="text-sm font-medium text-muted-foreground">Amount</p>
          <p className="text-2xl font-bold tracking-tight">
            {displayCents != null ? formatHkdFromCents(displayCents) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Final amount is confirmed on the payment screen.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button className="w-full" onClick={() => void startCheckout()} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pay with Stripe
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to={cancelHref}>Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
