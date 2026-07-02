import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/useUserRuns';

type UserDetailDialogProps = {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUsername?: string | null;
};

export function UserDetailDialog({
  userId,
  open,
  onOpenChange,
  initialUsername,
}: UserDetailDialogProps) {
  const { data: profile, isLoading } = useUserProfile(open ? userId ?? undefined : undefined);

  const username = profile?.username ?? initialUsername ?? null;
  const title = isLoading ? 'User details' : username ?? 'User not found';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-left text-lg font-bold">{title}</DialogTitle>
          {userId ? (
            <DialogDescription className="text-left text-xs text-muted-foreground">
              Profile details
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !profile && !userId ? (
          <p className="text-sm text-muted-foreground">No user selected.</p>
        ) : !profile ? (
          <p className="text-sm text-muted-foreground">User not found.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 text-xs">
              <p>
                <span className="font-semibold text-muted-foreground">Username: </span>
                {profile.username}
              </p>
              <p>
                <span className="font-semibold text-muted-foreground">User ID: </span>
                <span className="font-mono">{profile.user_id}</span>
              </p>
              {profile.created_at ? (
                <p>
                  <span className="font-semibold text-muted-foreground">Member since: </span>
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/users/${profile.user_id}`}>View coffee calendar</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/users/${profile.user_id}/vouchers`}>View vouchers</Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
