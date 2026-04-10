import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgs } from '@/hooks/useOrgs';
import { useOrgStaff } from '@/hooks/useOrgStaff';
import { useStoreConversionRates } from '@/hooks/useStoreConversionRates';

export default function SettingsPage() {
  const navigate = useNavigate();
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
        <h1 className="text-lg font-black uppercase tracking-tight">Settings</h1>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        {conversionRates.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Quiz conversion</h2>
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
