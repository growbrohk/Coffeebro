import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyHunts } from '@/hooks/useHunts';
import { ArrowLeft, MapPin, Plus } from 'lucide-react';
import type { Hunt } from '@/hooks/useHunts';

function StatusBadge({ status }: { status: Hunt['status'] }) {
  const styles: Record<Hunt['status'], string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-green-500/20 text-green-700 dark:text-green-400',
    ended: 'bg-muted/80 text-muted-foreground',
  };
  return (
    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function HostHuntsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: hunts = [], isLoading } = useMyHunts();

  if (loading || roleLoading) {
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
            Manage Hunts
          </h1>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-4">Sign in to manage hunts.</p>
            <Button onClick={() => navigate('/profile')} variant="outline" className="btn-run">
              Go to Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!canHostEvent) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
          <div className="flex items-center justify-center relative">
            <button onClick={() => navigate(-1)} className="absolute left-0 p-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Manage Hunts
            </h1>
          </div>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-2">Access Required</p>
            <p className="text-sm mb-4">Host access is required to manage hunts.</p>
            <Button onClick={() => navigate('/profile')} variant="outline" className="btn-run">
              Back to Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tight">
            Manage Hunts
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/host/offer/create?mode=hunt')}
            className="gap-1"
          >
            <Plus className="w-5 h-5" />
            Create
          </Button>
        </div>
      </div>

      <div className="container px-4 py-6">
        {isLoading ? (
          <div className="max-w-sm mx-auto text-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading hunts...</div>
          </div>
        ) : hunts.length === 0 ? (
          <div className="max-w-sm mx-auto text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You haven't created any hunts yet.</p>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Create your first treasure hunt to get started.
            </p>
            <Button
              className="w-full btn-run btn-run-yes"
              onClick={() => navigate('/host/offer/create?mode=hunt')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Hunt
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-w-sm mx-auto">
            {hunts.map((hunt) => (
              <button
                key={hunt.id}
                onClick={() => navigate(`/host/hunts/${hunt.id}`)}
                className="w-full p-4 bg-muted/50 rounded-lg border border-border text-left hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold uppercase flex-1 truncate">{hunt.name}</h3>
                  <StatusBadge status={hunt.status} />
                </div>
                {hunt.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {hunt.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
