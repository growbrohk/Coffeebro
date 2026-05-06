import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RedeemCodeCard } from "@/components/RedeemCodeCard";
import { useMyVouchers } from "@/hooks/useMyVouchers";
import { publishedCampaignsQueryKey } from "@/hooks/usePublishedCampaigns";
import { campaignVoucherPoolsQueryKey } from "@/hooks/usePublishedCampaignVoucherPools";

export default function CampaignClaimSuccessPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: vouchers = [], isLoading, refetch, isFetching } = useMyVouchers();

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["vouchers", "my"] });
    void queryClient.invalidateQueries({ queryKey: publishedCampaignsQueryKey });
    void queryClient.invalidateQueries({ queryKey: campaignVoucherPoolsQueryKey });
  }, [queryClient]);

  useEffect(() => {
    if (!sessionId || !campaignId) return;

    const started = Date.now();
    const iv = window.setInterval(() => {
      void refetch();
      if (Date.now() - started > 12_000) {
        setTimedOut(true);
        window.clearInterval(iv);
      }
    }, 1500);

    return () => window.clearInterval(iv);
  }, [sessionId, campaignId, refetch]);

  const forCampaign = useMemo(
    () => vouchers.filter((v) => v.campaign_id === campaignId),
    [vouchers, campaignId],
  );

  const successOpen = forCampaign.length > 0;

  if (!campaignId) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">Invalid link.</p>
        <Button className="mt-4" asChild variant="outline">
          <Link to="/hunts">Home</Link>
        </Button>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">
          Missing session. Check your wallet — the voucher may already be there.
        </p>
        <Button className="mt-4" asChild>
          <Link to={`/campaigns/${campaignId}`}>Back to campaign</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {!successOpen && !timedOut ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isLoading || isFetching ? "Confirming payment…" : "Checking your wallet…"}
          </p>
        </div>
      ) : null}

      {timedOut && !successOpen ? (
        <div className="max-w-md space-y-4 text-center">
          <p className="text-muted-foreground">
            We couldn&apos;t load your new voucher yet. Open <strong>Wallet</strong> — it may appear
            in a moment, or contact support with session id:{" "}
            <span className="break-all font-mono text-xs">{sessionId}</span>
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link to="/vouchers">My vouchers</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/campaigns/${campaignId}`}>Campaign</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={successOpen} onOpenChange={() => navigate(`/campaigns/${campaignId}`)}>
        <DialogContent className="border-border bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Added to wallet!
            </DialogTitle>
            <DialogDescription className="text-left text-sm text-muted-foreground">
              You unlocked {forCampaign.length} {forCampaign.length === 1 ? "voucher" : "vouchers"}:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {forCampaign.map((v) => (
              <RedeemCodeCard
                key={v.id}
                title="Your code"
                code={v.code}
                status="active"
                variant="voucher"
              />
            ))}
            <Button className="w-full" onClick={() => navigate("/vouchers")}>
              View My Vouchers
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
