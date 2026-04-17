import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ChevronLeft, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserRuns';
import { usePublicUserVouchers } from '@/hooks/usePublicUserVouchers';
import { PublicWalletVoucherCard } from '@/components/PublicWalletVoucherCard';
import { useMemo } from 'react';

export default function UserPublicVouchersPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile(userId);
  const { data: vouchers = [], isLoading: vouchersLoading } = usePublicUserVouchers(userId);

  const sortedVouchers = useMemo(() => {
    return [...vouchers].sort((a, b) => {
      const aActive = a.status === 'active' ? 0 : 1;
      const bActive = b.status === 'active' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [vouchers]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/leaderboard');
    }
  };

  if (!loading && !user) {
    return <Navigate to="/profile?msg=view-vouchers" replace />;
  }

  const isLoading = loading || profileLoading || vouchersLoading;

  const header = (
    <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 py-4 px-4 backdrop-blur-sm">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full"
          onClick={handleBack}
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading min-w-0 truncate text-center text-xl font-bold tracking-normal text-foreground sm:text-2xl">
          {profile ? `${profile.username}'s vouchers` : 'Vouchers'}
        </h1>
        <div className="w-10 shrink-0" />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background pb-24">
        {header}
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-sm font-semibold text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-24">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <p className="text-lg font-semibold">User not found</p>
          <Button variant="ghost" onClick={() => navigate('/leaderboard')} className="mt-4">
            Back to Leaderboard
          </Button>
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
          </div>
        ) : (
          <div className="mx-auto flex max-w-sm flex-col gap-3">
            {sortedVouchers.map((v) => (
              <PublicWalletVoucherCard key={v.id} voucher={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
