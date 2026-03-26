import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { ArrowLeft, Layers, Plus } from 'lucide-react';
import { OFFER_TYPE_LABELS } from '@/lib/offerTypes';
import { supabase } from '@/integrations/supabase/client';

type PresetRow = {
  id: string;
  org_id: string;
  name: string;
  offer_type: string;
  created_at: string;
  orgs: { org_name: string } | null;
};

export default function OfferPresetsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ['preset-offers-list', user?.id],
    enabled: !!user && canHostEvent,
    queryFn: async (): Promise<PresetRow[]> => {
      const { data, error } = await (supabase as any)
        .from('preset_offers')
        .select('id, org_id, name, offer_type, created_at, orgs(org_name)')
        .eq('created_by', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PresetRow[];
    },
  });

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
          <h1 className="text-2xl font-black uppercase tracking-tight text-center">Offer presets</h1>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-4">Sign in to manage presets.</p>
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
            <button type="button" onClick={() => navigate('/profile')} className="absolute left-0 p-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-black uppercase tracking-tight">Offer presets</h1>
          </div>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-2">Access Required</p>
            <p className="text-sm mb-4">Host access is required.</p>
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
          <button type="button" onClick={() => navigate('/profile')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tight">Offer presets</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/host/preset-offer/create')}
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
            <div className="animate-pulse text-muted-foreground">Loading presets...</div>
          </div>
        ) : presets.length === 0 ? (
          <div className="max-w-sm mx-auto text-center py-12">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You have no offer presets yet.</p>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Create a preset to reuse offer types and details in campaigns.
            </p>
            <Button className="w-full btn-run btn-run-yes" onClick={() => navigate('/host/preset-offer/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create preset
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-w-sm mx-auto">
            {presets.map((preset) => (
              <div key={preset.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                <Link
                  to={`/host/preset-offer/${preset.id}/edit`}
                  className="block w-full text-left hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md -m-1 p-1"
                >
                  <div className="flex items-start gap-2">
                    <Layers className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold uppercase truncate">{preset.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {OFFER_TYPE_LABELS[preset.offer_type] ?? preset.offer_type}
                        {preset.orgs?.org_name && <> · {preset.orgs.org_name}</>}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
