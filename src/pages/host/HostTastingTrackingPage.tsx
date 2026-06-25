import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgs } from '@/hooks/useOrgs';
import { useUserRole } from '@/hooks/useUserRole';
import { HostTastingTrackingPanel } from '@/components/host/HostTastingTrackingPanel';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function HostTastingTrackingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedOrgId = searchParams.get('orgId');
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isStaffUser, isLoading: roleLoading } = useUserRole();
  const { data: orgs = [], isLoading: orgsLoading } = useOrgs();

  const defaultOrgId = useMemo(() => {
    if (preselectedOrgId && orgs.some((o) => o.id === preselectedOrgId)) {
      return preselectedOrgId;
    }
    return orgs[0]?.id ?? null;
  }, [orgs, preselectedOrgId]);

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (defaultOrgId) {
      setSelectedOrgId(defaultOrgId);
    }
  }, [defaultOrgId]);

  const effectiveOrgId = selectedOrgId ?? defaultOrgId;

  const canAccess = Boolean(user && (isSuperAdmin || isStaffUser));

  if (authLoading || roleLoading || orgsLoading) {
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
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate('/settings')}>
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
            onClick={() => navigate('/settings')}
            className="absolute left-0 p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-xl font-bold">Tasting tracking</h1>
        </div>
      </div>

      <div className="container max-w-lg space-y-6 px-4 py-6">
        {orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizations assigned yet.</p>
        ) : (
          <>
            {orgs.length > 1 ? (
              <Select
                value={effectiveOrgId ?? undefined}
                onValueChange={(v) => setSelectedOrgId(v)}
              >
                <SelectTrigger aria-label="Organization">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.org_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {effectiveOrgId ? (
              <HostTastingTrackingPanel key={effectiveOrgId} orgId={effectiveOrgId} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
