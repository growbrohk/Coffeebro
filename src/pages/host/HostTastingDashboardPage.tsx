import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrgs';
import { useUserRole } from '@/hooks/useUserRole';
import { useHostTastingDashboard } from '@/hooks/useTastingTracking';
import { StatCard, StatCardGrid } from '@/components/admin/tasting-tracking/StatCards';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tastingTierLabel } from '@/lib/tastingTrackingLabels';

export default function HostTastingDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: org, isLoading: orgLoading } = useOrg(orgId);

  const { data: dashboardRows = [], isLoading: dashLoading, error } = useHostTastingDashboard(orgId);

  const packageOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of dashboardRows) {
      if (!seen.has(row.package_id)) seen.set(row.package_id, row.package_title);
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  }, [dashboardRows]);

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const effectivePackageId = selectedPackageId ?? packageOptions[0]?.id ?? null;

  const tierRows = useMemo(
    () => dashboardRows.filter((r) => r.package_id === effectivePackageId),
    [dashboardRows, effectivePackageId],
  );

  const canAccess = Boolean(user && orgId && (isSuperAdmin || canHostEvent));

  if (authLoading || roleLoading || orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm font-semibold">Loading…</div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Host access required.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate('/host/orgs')}>
          Back
        </Button>
      </div>
    );
  }

  const activePackageTitle = packageOptions.find((p) => p.id === effectivePackageId)?.title ?? '—';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="relative flex items-center justify-center px-4 py-4">
          <button
            type="button"
            onClick={() => navigate('/host/orgs')}
            className="absolute left-0 p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-xl font-bold">Tasting ops</h1>
        </div>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Your shop</p>
          <p className="text-lg font-semibold">{org?.org_name ?? 'Shop'}</p>
        </div>

        {packageOptions.length > 1 ? (
          <Select
            value={effectivePackageId ?? undefined}
            onValueChange={(v) => setSelectedPackageId(v)}
          >
            <SelectTrigger aria-label="Campaign package">
              <SelectValue placeholder="Select package" />
            </SelectTrigger>
            <SelectContent>
              {packageOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm font-medium">{activePackageTitle}</p>
        )}

        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : dashLoading ? (
          <p className="text-sm text-muted-foreground">Loading stats…</p>
        ) : tierRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasting package assigned to this shop yet.</p>
        ) : (
          tierRows.map((row) => (
            <div key={`${row.package_id}-${row.tier}`} className="space-y-4">
              <p className="text-sm text-muted-foreground">{tastingTierLabel(row.tier)}</p>
              <StatCardGrid className="grid-cols-3">
                <StatCard label="Expected" value={String(row.expected_vouchers)} />
                <StatCard label="Redeemed" value={String(row.redeemed)} />
                <StatCard label="Remaining" value={String(row.remaining)} />
              </StatCardGrid>
              <p className="text-sm text-muted-foreground">
                Item: <span className="font-medium text-foreground">{row.item_name}</span>
              </p>
            </div>
          ))
        )}

        <Button type="button" className="w-full" size="lg" onClick={() => navigate('/scan')}>
          <QrCode className="mr-2 h-5 w-5" />
          Scan voucher
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/host/org/${orgId}/redemptions`)}
        >
          Redemption history
        </Button>
      </div>
    </div>
  );
}
