import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMyVouchers } from '@/hooks/useMyVouchers';
import { RedeemCodeCard } from '@/components/RedeemCodeCard';
import { Button } from '@/components/ui/button';
import { Ticket } from 'lucide-react';

export default function MyVouchersPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: vouchers = [], isLoading } = useMyVouchers();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
          <h1 className="text-2xl font-black uppercase tracking-tight text-center">
            My Vouchers
          </h1>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-4">Sign in to view your vouchers.</p>
            <Button onClick={() => navigate('/profile')} variant="outline" className="btn-run">
              Go to Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <h1 className="text-2xl font-black uppercase tracking-tight text-center">
          My Vouchers
        </h1>
      </div>

      <div className="container px-4 py-6">
        {vouchers.length === 0 ? (
          <div className="max-w-sm mx-auto text-center py-12">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No vouchers yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Join a hunt and scan treasures to unlock vouchers!
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => navigate('/hunts')}
            >
              Browse Hunts
            </Button>
          </div>
        ) : (
          <div className="space-y-4 max-w-sm mx-auto">
            {vouchers.map((v) => (
              <div
                key={v.id}
                className="p-4 bg-muted/50 rounded-lg border border-border"
              >
                <p className="text-sm font-semibold mb-2">{v.title}</p>
                {v.org_name && (
                  <p className="text-xs text-muted-foreground mb-2">{v.org_name}</p>
                )}
                <RedeemCodeCard
                  code={v.code}
                  status={v.status}
                  variant="voucher"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
