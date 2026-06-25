import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Gift, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMyVouchers } from '@/hooks/useMyVouchers';
import { publishedTastingPackagesQueryKey } from '@/hooks/usePublishedTastingPackages';

export default function TastingPackagePurchaseSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: vouchers = [], isLoading, refetch } = useMyVouchers();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['vouchers', 'my'] });
    void queryClient.invalidateQueries({ queryKey: publishedTastingPackagesQueryKey });
    void queryClient.invalidateQueries({ queryKey: ['tasting-package-purchases'] });
  }, [queryClient]);

  useEffect(() => {
    if (!sessionId || !id) return;

    const started = Date.now();
    const iv = window.setInterval(() => {
      void refetch();
      if (Date.now() - started > 12_000) {
        setTimedOut(true);
        window.clearInterval(iv);
      }
    }, 1500);

    return () => window.clearInterval(iv);
  }, [sessionId, id, refetch]);

  const tastingVouchers = useMemo(
    () => vouchers.filter((v) => v.tasting_package_id === id),
    [vouchers, id],
  );

  const successOpen = tastingVouchers.length > 0;

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
      {!successOpen && !timedOut ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Minting your tasting vouchers…</p>
          <p className="text-xs text-muted-foreground">This usually takes a few seconds.</p>
        </div>
      ) : null}

      {timedOut && !successOpen ? (
        <div className="max-w-sm space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Still processing. Open your wallet in a moment — if nothing appears, contact support with your
            payment receipt.
          </p>
          <Button className="w-full" onClick={() => void refetch()} disabled={isLoading}>
            Refresh wallet
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
              {tastingVouchers.length} voucher{tastingVouchers.length === 1 ? '' : 's'} added to your wallet.
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
