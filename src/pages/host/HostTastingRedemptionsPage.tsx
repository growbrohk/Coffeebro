import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrgs';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useHostTastingDashboard,
  useHostTastingRedemptions,
} from '@/hooks/useTastingTracking';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatTrackingDateShort } from '@/lib/tastingTrackingLabels';

export default function HostTastingRedemptionsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: org, isLoading: orgLoading } = useOrg(orgId);

  const { data: dashboardRows = [] } = useHostTastingDashboard(orgId);

  const packageOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of dashboardRows) {
      if (!seen.has(row.package_id)) seen.set(row.package_id, row.package_title);
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  }, [dashboardRows]);

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const effectivePackageId = selectedPackageId ?? packageOptions[0]?.id ?? null;

  const { data: rows = [], isLoading, error } = useHostTastingRedemptions(
    orgId,
    effectivePackageId,
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="relative flex items-center justify-center px-4 py-4">
          <button
            type="button"
            onClick={() => navigate(`/host/org/${orgId}/tasting`)}
            className="absolute left-0 p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-xl font-bold">Redemption history</h1>
        </div>
      </div>

      <div className="container max-w-lg space-y-4 px-4 py-6">
        <p className="text-sm text-muted-foreground">{org?.org_name ?? 'Shop'}</p>

        {packageOptions.length > 1 ? (
          <Select
            value={effectivePackageId ?? undefined}
            onValueChange={(v) => setSelectedPackageId(v)}
          >
            <SelectTrigger aria-label="Package">
              <SelectValue placeholder="All packages" />
            </SelectTrigger>
            <SelectContent>
              {packageOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No redemptions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.voucher_id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatTrackingDateShort(r.redeemed_at)}
                  </TableCell>
                  <TableCell>{r.buyer_name}</TableCell>
                  <TableCell>{r.item_name}</TableCell>
                  <TableCell className="capitalize">{r.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
