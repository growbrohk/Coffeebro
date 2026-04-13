import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyVouchers } from '@/hooks/useMyVouchers';
import { useUserRole } from '@/hooks/useUserRole';
import { WalletVoucherCard } from '@/components/WalletVoucherCard';
import { ScanNavButton } from '@/components/ScanNavButton';
import { Button } from '@/components/ui/button';

export default function MyVouchersPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: vouchers = [], isLoading } = useMyVouchers();

  const sortedVouchers = useMemo(() => {
    return [...vouchers].sort((a, b) => {
      const aActive = a.status === 'active' ? 0 : 1;
      const bActive = b.status === 'active' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [vouchers]);

  const showHostScan = Boolean(user && !roleLoading && canHostEvent);

  const header = (
    <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 py-4 px-4 backdrop-blur-sm">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="min-w-0 truncate text-center text-lg font-bold lowercase tracking-tight text-foreground">
          my wallet
        </h1>
        <div className="flex shrink-0 justify-end">
          {showHostScan ? <ScanNavButton onClick={() => navigate('/scan')} /> : <div className="w-10" />}
        </div>
      </div>
    </div>
  );

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-24">
        {header}
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-sm font-semibold text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        {header}
        <div className="px-4 py-6">
          <div className="card mx-auto max-w-sm p-6 text-center">
            <p className="mb-4 text-sm font-semibold text-foreground">Sign in to view your vouchers.</p>
            <Button onClick={() => navigate('/profile')} variant="default" className="w-full">
              Go to Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {header}

      <div className="px-4 py-6">
        {sortedVouchers.length === 0 ? (
          <div className="mx-auto max-w-sm space-y-3 py-12 text-center">
            <Ticket className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No vouchers yet.</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Join a hunt and scan treasures to unlock vouchers!
            </p>
            <Button variant="default" className="mt-4 w-full" onClick={() => navigate('/hunts')}>
              Browse Hunts
            </Button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-sm flex-col gap-3">
            {sortedVouchers.map((v) => (
              <WalletVoucherCard key={v.id} voucher={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
