import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAllTastingPackages } from '@/hooks/usePublishedTastingPackages';
import { useToggleTastingPackageActive } from '@/hooks/useTastingPackageMutations';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { formatPackageDistricts } from '@/types/tastingPackage';

function statusBadgeLabel(status: string, isActive: boolean): string {
  if (status === 'draft') return 'draft';
  return isActive ? 'published · active' : 'published · inactive';
}

export default function AdminTastingPackagesPage() {
  const navigate = useNavigate();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: packages = [], isLoading } = useAllTastingPackages();
  const toggleActive = useToggleTastingPackageActive();

  const sorted = useMemo(
    () => [...packages].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [packages],
  );

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm font-semibold">Loading…</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-muted-foreground">Super admin only.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/settings')}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-4 py-4">
        <button type="button" onClick={() => navigate('/settings')} className="mr-2 p-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="font-heading text-xl font-bold">Tasting packages</h1>
      </div>

      <div className="container max-w-lg space-y-4 px-4 py-6">
        <Button type="button" className="w-full" onClick={() => navigate('/admin/tasting-packages/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New tasting package
        </Button>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No packages yet.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((pkg) => {
              const singleCount = pkg.shops.filter((s) => s.tier === 'single').length;
              const duoCount = pkg.shops.filter((s) => s.tier === 'duo').length;
              const isPublished = pkg.status === 'published';
              const badgeLabel = statusBadgeLabel(pkg.status, pkg.is_active);

              return (
                <div
                  key={pkg.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/tasting-packages/${pkg.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/admin/tasting-packages/${pkg.id}`);
                    }
                  }}
                  className="flex w-full cursor-pointer flex-col gap-1 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{pkg.title}</p>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                        isPublished && pkg.is_active
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {badgeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatPackageDistricts(pkg.districts)}</p>
                  <p className="text-xs text-muted-foreground">
                    Single: {singleCount} shops · Duo: {duoCount} shops
                  </p>
                  <div
                    className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-3"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs font-medium text-muted-foreground">Show in app</span>
                    <Switch
                      checked={pkg.is_active}
                      disabled={!isPublished || toggleActive.isPending}
                      aria-label={`Toggle visibility for ${pkg.title}`}
                      onCheckedChange={(checked) => {
                        toggleActive.mutate({ packageId: pkg.id, isActive: checked });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
