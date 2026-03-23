import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useHostOffers } from '@/hooks/useHostOffers';
import { ArrowLeft, Pencil, QrCode, Users } from 'lucide-react';
import { getOfferTypeLabel } from '@/lib/offerForm';
import type { HostOffer } from '@/hooks/useHostOffers';
import QRCode from 'react-qr-code';

function OfferList({
  offers,
  navigate,
  showQrButton,
}: {
  offers: HostOffer[];
  navigate: (path: string) => void;
  showQrButton: boolean;
}) {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedForQr, setSelectedForQr] = useState<{ name: string; qr_code_id: string } | null>(null);

  return (
    <>
      <div className="space-y-3">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="p-4 bg-muted/50 rounded-lg border border-border"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold uppercase truncate">{offer.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {offer.source_type === 'calendar'
                    ? offer.event_date
                      ? offer.event_date
                      : 'Calendar'
                    : offer.hunt_name
                      ? offer.hunt_name
                      : 'Hunt'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getOfferTypeLabel(offer.offer_type as any)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/host/offer/${offer.id}/edit`);
                  }}
                  aria-label="Edit offer"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {showQrButton && offer.qr_code_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedForQr({ name: offer.name, qr_code_id: offer.qr_code_id! });
                      setQrDialogOpen(true);
                    }}
                    aria-label="View QR code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/offers/${offer.id}/participants`);
                  }}
                  aria-label="View participants"
                >
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{selectedForQr?.name}</DialogTitle>
          </DialogHeader>
          {selectedForQr && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-3 rounded-md">
                <QRCode value={selectedForQr.qr_code_id} size={200} />
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {selectedForQr.qr_code_id}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function HostOffersPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'calendar' | 'hunt'>('calendar');
  const { user, loading } = useAuth();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: offers = [], isLoading } = useHostOffers();

  const calendarOffers = offers.filter((o) => o.source_type === 'calendar');
  const huntOffers = offers.filter((o) => o.source_type === 'hunt');

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
            Manage Offers
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
              Manage Offers
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
            Manage Offers
          </h1>
        </div>
      </div>

      <div className="container px-4 py-6">
        {isLoading ? (
          <div className="max-w-sm mx-auto text-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading offers...</div>
          </div>
        ) : offers.length === 0 ? (
          <div className="max-w-sm mx-auto text-center py-12">
            <p className="text-muted-foreground">You haven&apos;t created any offers yet.</p>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Create a calendar offer or add treasures to a hunt to get started.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/host/offer/create')}
              >
                Create Coffee Offer
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/host/offer/create?mode=hunt')}
              >
                Create Hunt
              </Button>
            </div>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'calendar' | 'hunt')}
            className="max-w-sm mx-auto"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="hunt">Hunt</TabsTrigger>
            </TabsList>
            <TabsContent value="calendar" className="mt-0">
              <OfferList offers={calendarOffers} navigate={navigate} showQrButton={false} />
              {calendarOffers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No calendar offers yet.{' '}
                  <button
                    type="button"
                    className="underline font-medium"
                    onClick={() => navigate('/host/offer/create')}
                  >
                    Create one
                  </button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="hunt" className="mt-0">
              <OfferList offers={huntOffers} navigate={navigate} showQrButton={true} />
              {huntOffers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hunt offers yet.{' '}
                  <button
                    type="button"
                    className="underline font-medium"
                    onClick={() => navigate('/host/offer/create?mode=hunt')}
                  >
                    Add treasure to a hunt
                  </button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
