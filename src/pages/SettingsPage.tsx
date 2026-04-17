import { useState, type CSSProperties } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, QrCode } from 'lucide-react';
import { HuntTreasureQrCard } from '@/components/campaigns/HuntTreasureQrCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgs } from '@/hooks/useOrgs';
import { useOrgStaff } from '@/hooks/useOrgStaff';
import { useStoreConversionRates } from '@/hooks/useStoreConversionRates';
import { getCoffeebroMarketingSiteUrl } from '@/lib/quiz/share';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [siteQrOpen, setSiteQrOpen] = useState(false);
  const marketingSiteUrl = getCoffeebroMarketingSiteUrl();
  const { user, loading, signOut } = useAuth();
  const { isSuperAdmin, isStaffUser, isLoading: roleLoading } = useUserRole();
  const { data: orgs = [] } = useOrgs();
  const { isLoading: staffLoading } = useOrgStaff();
  const orgIds = orgs.map((o) => o.id);
  const { data: conversionRates = [] } = useStoreConversionRates(orgIds);

  const handleSignOut = async () => {
    await signOut();
    navigate('/profile');
  };

  if (loading || roleLoading || staffLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="absolute left-0 p-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-2xl font-bold tracking-normal">Settings</h1>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        {conversionRates.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-normal text-muted-foreground">Quiz conversion</h2>
            {conversionRates.map((cr) => {
              const org = orgs.find((o) => o.id === cr.store_id);
              return (
                <div
                  key={cr.store_id}
                  className="flex items-center justify-between rounded-xl bg-muted/60 p-4"
                >
                  <div>
                    <p className="font-semibold">{org?.org_name ?? cr.store_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {cr.starts} starts · {cr.signups} signups
                    </p>
                  </div>
                  <p className="text-xl font-black">{cr.conversion_rate}%</p>
                </div>
              );
            })}
          </div>
        )}

        {isSuperAdmin && (
          <Button type="button" variant="default" className="w-full" onClick={() => navigate('/admin/orgs')}>
            Organizations
          </Button>
        )}

        {isStaffUser && !isSuperAdmin && orgs.length > 0 && (
          <Button type="button" variant="default" className="w-full" onClick={() => navigate('/host/orgs')}>
            My organizations
          </Button>
        )}

        <div
          className="rounded-2xl bg-[#f37721] p-4"
          style={{ '--quiz-fg': '#ffffff' } as CSSProperties}
        >
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full border-white/80 bg-transparent font-semibold text-[var(--quiz-fg)] hover:bg-white/10 hover:text-[var(--quiz-fg)]"
            onClick={() => setSiteQrOpen(true)}
          >
            <QrCode className="h-4 w-4 shrink-0" aria-hidden />
            Share CoffeeBro QR
          </Button>
        </div>

        <Dialog open={siteQrOpen} onOpenChange={setSiteQrOpen}>
          <DialogContent className="max-h-[min(90dvh,720px)] max-w-[min(100vw-1.5rem,20rem)] gap-2 overflow-y-auto rounded-2xl p-4 sm:max-w-[22rem]">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base">CoffeeBro site QR</DialogTitle>
              <DialogDescription className="text-xs leading-snug">
                Print or share so people can open the CoffeeBro site.
              </DialogDescription>
            </DialogHeader>
            <HuntTreasureQrCard
              qrPayload={marketingSiteUrl}
              campaignId="coffeebro-site"
              qrSize={168}
              compact
              className="border-0 bg-transparent p-0 shadow-none"
              campaignTitle="make every coffee an advantage"
              orgName="CoffeeBro"
              copySuccessDescription="CoffeeBro site QR card image copied to clipboard."
            />
          </DialogContent>
        </Dialog>

        <Button
          type="button"
          onClick={handleSignOut}
          className="w-full btn-run btn-run-no"
          variant="outline"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
