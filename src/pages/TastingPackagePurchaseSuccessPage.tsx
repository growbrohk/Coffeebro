import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Gift, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  publishedTastingPackagesQueryKey,
  useTastingPackagePurchaseBySession,
} from '@/hooks/usePublishedTastingPackages';
import { clearAffiliateRef } from '@/lib/tastingAffiliateRef';

export default function TastingPackagePurchaseSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data: purchase,
    refetch: refetchPurchase,
    isLoading: purchaseLoading,
  } = useTastingPackagePurchaseBySession(sessionId);

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['vouchers', 'my'] });
    void queryClient.invalidateQueries({ queryKey: publishedTastingPackagesQueryKey });
    void queryClient.invalidateQueries({ queryKey: ['tasting-package-purchases'] });
    void queryClient.invalidateQueries({ queryKey: ['tasting-package-purchase', 'session'] });
  }, [queryClient]);

  useEffect(() => {
    if (id && (purchase?.status === 'paid' || purchase?.status === 'minted')) {
      clearAffiliateRef(id);
    }
  }, [id, purchase?.status]);

  const mintFailed = purchase?.status === 'failed';
  const mintSucceeded = purchase?.status === 'minted';
  const stillPending =
    Boolean(sessionId) &&
    !purchaseLoading &&
    purchase != null &&
    (purchase.status === 'pending' || purchase.status === 'paid') &&
    !mintSucceeded;

  const successOpen = mintSucceeded;

  const handleRefresh = () => {
    void refetchPurchase();
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">Invalid link.</p>
        <Button className="mt-4" asChild variant="outline">
          <Link to="/explore">Explore</Link>
        </Button>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">
          Missing session. Check your wallet — vouchers may already be there.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/vouchers">Open wallet</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 pb-24">
      {stillPending ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Minting your tasting vouchers…</p>
          <p className="text-xs text-muted-foreground">This usually takes a few seconds.</p>
        </div>
      ) : null}

      {mintFailed ? (
        <div className="max-w-sm space-y-4 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <p className="text-sm font-semibold text-foreground">Could not add vouchers to your wallet</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {purchase?.mint_error?.trim() ||
              'Something went wrong after payment. Contact support with your payment receipt.'}
          </p>
          <Button className="w-full" onClick={() => void handleRefresh()}>
            Try again
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/vouchers">Open wallet</Link>
          </Button>
        </div>
      ) : null}

      {!stillPending && !mintFailed && !successOpen ? (
        <div className="max-w-sm space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking your wallet…</p>
          <Button className="w-full" onClick={() => void handleRefresh()}>
            Refresh
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/vouchers">Go to wallet</Link>
          </Button>
        </div>
      ) : null}

      <Dialog open={successOpen} onOpenChange={(open) => !open && navigate('/vouchers')}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Tasting package ready!
            </DialogTitle>
            <DialogDescription>
              Your tasting vouchers have been added to your wallet.
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full" onClick={() => navigate('/vouchers')}>
            View wallet
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
