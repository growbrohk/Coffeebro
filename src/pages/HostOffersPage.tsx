import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useHostOffers } from '@/hooks/useHostOffers';
import { ArrowLeft, Calendar, MapPin, Plus, Users } from 'lucide-react';
import { OFFER_TYPE_LABELS } from '@/lib/offerTypes';

export default function HostOffersPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: offers = [], isLoading } = useHostOffers();

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
            Manage Campaigns
          </h1>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-4">Sign in to manage offers.</p>
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
              Manage Campaigns
            </h1>
          </div>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-2">Access Required</p>
            <p className="text-sm mb-4">Host access is required to manage offers.</p>
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
            Manage Campaigns
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/host/offer-campaign/create')}
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
            <div className="animate-pulse text-muted-foreground">Loading offers...</div>
          </div>
        ) : offers.length === 0 ? (
          <div className="max-w-sm mx-auto text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You haven't created any offers yet.</p>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Create an offer campaign (calendar or hunt).
            </p>
            <Button
              className="w-full btn-run btn-run-yes"
              onClick={() => navigate('/host/offer-campaign/create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Offer Campaign
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-w-sm mx-auto">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="p-4 bg-muted/50 rounded-lg border border-border"
              >
                <button
                  onClick={() => navigate(`/host/offer-campaign/${offer.id}/edit`)}
                  className="w-full text-left hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-start gap-2">
                    {offer.source_type === 'hunt' ? (
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    ) : (
                      <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold uppercase truncate">{offer.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {OFFER_TYPE_LABELS[offer.offer_type] ?? offer.offer_type}
                        {offer.source_type === 'hunt' && offer.hunt_name && (
                          <> · {offer.hunt_name}</>
                        )}
                        {offer.event_date && (
                          <> · {offer.event_date}</>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
                <div className="mt-2 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-muted-foreground"
                    onClick={() => navigate(`/offers/${offer.id}/participants`)}
                  >
                    <Users className="w-4 h-4" />
                    View participants
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
