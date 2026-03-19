import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useHunt, useIsParticipant, useJoinHunt } from '@/hooks/useHunts';
import { MapPin, QrCode, Loader2 } from 'lucide-react';

export default function HuntDetailPage() {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { canHostEvent } = useUserRole();
  const { data: hunt, isLoading } = useHunt(huntId ?? null);
  const { data: isParticipant } = useIsParticipant(huntId ?? null);
  const joinHunt = useJoinHunt();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!hunt) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Hunt not found.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/hunts')}
          >
            Back to Hunts
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <span className="text-lg font-bold">←</span>
          </button>
          <h1 className="text-2xl font-black uppercase tracking-tight text-center -mt-8">
            {hunt.name}
          </h1>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-4">Sign in to join this hunt.</p>
            <Button onClick={() => navigate('/profile')} variant="outline" className="btn-run">
              Go to Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleJoin = async () => {
    if (!huntId || isParticipant) return;
    try {
      await joinHunt.mutateAsync(huntId);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <span className="text-lg font-bold">←</span>
          </button>
          <h1 className="text-xl font-black uppercase tracking-tight flex-1">
            {hunt.name}
          </h1>
        </div>
      </div>

      <div className="container px-4 py-6 max-w-sm mx-auto space-y-6">
        {hunt.description && (
          <p className="text-muted-foreground">{hunt.description}</p>
        )}

        {!isParticipant ? (
          <Button
            className="w-full btn-run btn-run-yes"
            onClick={handleJoin}
            disabled={joinHunt.isPending}
          >
            {joinHunt.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Join Hunt
          </Button>
        ) : (
          <>
            <Button
              className="w-full btn-run"
              onClick={() => navigate(`/hunts/${huntId}/map`)}
            >
              <MapPin className="h-4 w-4 mr-2" />
              View Map
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/hunts/${huntId}/scan`)}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR
            </Button>
          </>
        )}

        {canHostEvent && hunt.created_by === user.id && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/host/hunts/${huntId}`)}
          >
            Manage Hunt
          </Button>
        )}
      </div>
    </div>
  );
}
