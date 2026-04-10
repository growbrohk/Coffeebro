import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImageIcon, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgs } from '@/hooks/useOrgs';
import { useOrgStaff } from '@/hooks/useOrgStaff';
import { canEditOrgProfileForOrgRole } from '@/lib/orgStaff';

const ORG_ROLE_LABEL: Record<string, string> = {
  owner: 'Primary owner',
  host: 'Host',
  manager: 'Manager',
  barista: 'Barista',
};

export default function HostOrgsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isSuperAdmin, isStaffUser, isLoading: roleLoading } = useUserRole();
  const { data: orgs = [], isLoading: orgsLoading } = useOrgs();
  const { data: staffAssignments = [], isLoading: staffLoading } = useOrgStaff();

  if (loading || roleLoading || orgsLoading || staffLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Sign in to continue.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate('/profile')}>
          Profile
        </Button>
      </div>
    );
  }

  if (isSuperAdmin || !isStaffUser) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
          <button type="button" onClick={() => navigate('/settings')} className="absolute left-0 p-2" aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-black uppercase tracking-tight">Organizations</h1>
        </div>
        <div className="container max-w-lg px-4 py-8">
          <p className="text-center text-muted-foreground">This page is only for café staff accounts.</p>
          <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate('/settings')}>
            Back to settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-background px-4 py-4">
        <button type="button" onClick={() => navigate('/settings')} className="absolute left-0 p-2" aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-black uppercase tracking-tight">My organizations</h1>
      </div>

      <div className="container max-w-lg space-y-4 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          Organizations you are assigned to. Only these cafés appear here.
        </p>

        {orgs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No organizations assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {orgs.map((o) => {
              const role = staffAssignments.find((a) => a.org_id === o.id)?.role;
              const isPrimaryOwner = user?.id != null && o.owner_user_id === user.id;
              const roleLabel =
                (role ? ORG_ROLE_LABEL[role] ?? role : '') ||
                (isPrimaryOwner ? ORG_ROLE_LABEL.owner : '');
              const canEdit =
                (role !== undefined && canEditOrgProfileForOrgRole(role)) || isPrimaryOwner;

              return (
                <li
                  key={o.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"
                >
                  {o.logo_url || o.preview_photo_url ? (
                    <img
                      src={(o.logo_url || o.preview_photo_url) as string}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/50">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{o.org_name}</p>
                    {o.mtr_station ? (
                      <p className="text-xs text-muted-foreground">{o.mtr_station}</p>
                    ) : null}
                    {roleLabel ? (
                      <p className="text-xs text-muted-foreground">Role: {roleLabel}</p>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => navigate(`/host/org/${o.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
