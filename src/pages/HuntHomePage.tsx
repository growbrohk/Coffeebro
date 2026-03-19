import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useHunts, useAllTreasures } from '@/hooks/useHunts';
import { HuntMap } from '@/components/HuntMap';
import { MapPin } from 'lucide-react';

export default function HuntHomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'map' | 'hunts'>('map');
  const [selectedHuntId, setSelectedHuntId] = useState<string | null>(null);
  const { data: hunts = [], isLoading: huntsLoading } = useHunts();
  const { data: treasures = [], isLoading: treasuresLoading } = useAllTreasures(selectedHuntId);

  if (loading || huntsLoading) {
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
            <button
              onClick={() => navigate('/profile')}
              className="px-4 py-2 border border-background rounded-md text-sm font-medium"
            >
              Go to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="shrink-0 bg-background py-4 px-4 border-b border-border">
        <h1 className="text-2xl font-black uppercase tracking-tight text-center">
          Hunt
        </h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'map' | 'hunts')}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid w-full grid-cols-2 shrink-0 mx-4 mt-4">
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="hunts">Hunts</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 flex flex-col">
          {activeTab === 'map' ? (
            <>
              {hunts.length > 0 && (
                <div className="flex gap-2 overflow-x-auto shrink-0 px-4 pt-2 pb-2">
                  <button
                    onClick={() => setSelectedHuntId(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selectedHuntId === null
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                  >
                    All
                  </button>
                  {hunts.map((hunt) => (
                    <button
                      key={hunt.id}
                      onClick={() => setSelectedHuntId(hunt.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        selectedHuntId === hunt.id
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-muted/50 border-border hover:bg-muted'
                      }`}
                    >
                      {hunt.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 min-h-0 relative">
                {treasuresLoading ? (
                  <div className="absolute inset-0 bg-muted/30 flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Loading map...</div>
                  </div>
                ) : (
                  <div className="absolute inset-0">
                    <HuntMap treasures={treasures} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto py-4 px-4 pb-24">
              {hunts.length === 0 ? (
                <div className="max-w-sm mx-auto text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active hunts right now.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Check back later for new treasure hunts!
                  </p>
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
          )}
        </div>
      </Tabs>
    </div>
  );
}
