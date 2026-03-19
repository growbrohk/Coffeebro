import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useHunts } from '@/hooks/useHunts';
import { MapPin } from 'lucide-react';

export default function HuntListPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: hunts = [], isLoading } = useHunts();

  if (loading || isLoading) {
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
            Hunt
          </h1>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-4">Sign in to browse hunts.</p>
            <Button onClick={() => navigate('/profile')} variant="outline" className="btn-run">
              Go to Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <h1 className="text-2xl font-black uppercase tracking-tight text-center">
          Hunt
        </h1>
      </div>

      <div className="container px-4 py-6">
        {hunts.length === 0 ? (
          <div className="max-w-sm mx-auto text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active hunts right now.</p>
            <p className="text-sm text-muted-foreground mt-2">Check back later for new treasure hunts!</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-sm mx-auto">
            {hunts.map((hunt) => (
              <button
                key={hunt.id}
                onClick={() => navigate(`/hunts/${hunt.id}/map`)}
                className="w-full p-4 bg-muted/50 rounded-lg border border-border text-left hover:bg-muted transition-colors"
              >
                <h3 className="font-bold uppercase">{hunt.name}</h3>
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
